require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const app = express();
app.use(express.json());
app.use('/vendor/tabler', express.static(path.join(__dirname, 'node_modules', '@tabler', 'core', 'dist')));
app.use('/vendor/apexcharts', express.static(path.join(__dirname, 'node_modules', 'apexcharts', 'dist')));
app.use(express.static('public'));
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '', database: process.env.DB_NAME || 'rs_tienda',
  dateStrings: true, waitForConnections: true, connectionLimit: 5 });

const PK = { categorias: 'id_categoria', productos: 'id_producto', clientes: 'id_cliente', ventas: 'id_venta', detalle_ventas: 'id_detalle' };
const usuario = (req) => req.get('x-usuario') || 'web';

// Transacción que fija @app_usuario para que los triggers registren quién hizo el cambio
async function run(req, sql, params = []) {
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    await c.query('SET @app_usuario = ?', [usuario(req)]);
    const [r] = await c.query(sql, params);
    await c.commit();
    return r;
  } catch (e) { await c.rollback(); throw e; } finally { c.release(); }
}
const wrap = (fn) => (req, res) => fn(req, res).catch(e => res.status(400).json({ error: e.message }));

app.get('/api/auditoria', wrap(async (req, res) => {
  const { desde = '1900-01-01', hasta = '2999-12-31', tabla = '', operacion = '' } = req.query;
  res.json(await run(req, `SELECT * FROM v_auditoria WHERE DATE(fecha) BETWEEN ? AND ?
    AND (? = '' OR tabla = ?) AND (? = '' OR operacion = ?)`, [desde, hasta, tabla, tabla, operacion, operacion]));
}));

const dateString = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0')
].join('-');

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1000) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

app.get('/api/estadisticas/dashboard', wrap(async (req, res) => {
  const now = new Date();
  const defaultDesde = dateString(new Date(now.getFullYear(), now.getMonth() - 11, 1));
  const defaultHasta = dateString(now);
  const desde = req.query.desde || defaultDesde;
  const hasta = req.query.hasta || defaultHasta;

  if (!isValidDate(desde) || !isValidDate(hasta)) {
    throw new Error('Las fechas deben tener el formato YYYY-MM-DD y ser válidas');
  }
  if (desde > hasta) {
    throw new Error('La fecha inicial no puede ser posterior a la fecha final');
  }

  const range = [desde, hasta];
  const [monthlyResult, topProductsResult, categoriesResult, unitsResult] = await Promise.all([
    pool.query(`SELECT DATE_FORMAT(fecha, '%Y-%m') AS mes,
        COUNT(*) AS ventas, COALESCE(SUM(total), 0) AS ingresos
      FROM ventas
      WHERE fecha >= ? AND fecha < DATE_ADD(?, INTERVAL 1 DAY)
      GROUP BY mes ORDER BY mes`, range),
    pool.query(`SELECT p.id_producto, p.nombre,
        COALESCE(SUM(d.cantidad), 0) AS unidades
      FROM detalle_ventas d
      INNER JOIN ventas v ON v.id_venta = d.id_venta
      INNER JOIN productos p ON p.id_producto = d.id_producto
      WHERE v.fecha >= ? AND v.fecha < DATE_ADD(?, INTERVAL 1 DAY)
      GROUP BY p.id_producto, p.nombre
      ORDER BY unidades DESC, p.nombre ASC
      LIMIT 10`, range),
    pool.query(`SELECT COALESCE(c.nombre, 'Sin categoría') AS categoria,
        COUNT(p.id_producto) AS productos
      FROM productos p
      LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
      GROUP BY c.id_categoria, c.nombre
      ORDER BY productos DESC, categoria ASC`),
    pool.query(`SELECT COALESCE(SUM(d.cantidad), 0) AS unidades_vendidas
      FROM detalle_ventas d
      INNER JOIN ventas v ON v.id_venta = d.id_venta
      WHERE v.fecha >= ? AND v.fecha < DATE_ADD(?, INTERVAL 1 DAY)`, range)
  ]);

  const monthly = monthlyResult[0];
  const topProducts = topProductsResult[0];
  const categories = categoriesResult[0];
  const totalVentas = monthly.reduce((sum, item) => sum + Number(item.ventas), 0);
  const totalIngresos = monthly.reduce((sum, item) => sum + Number(item.ingresos), 0);

  res.json({
    periodo: { desde, hasta },
    resumen: {
      ventas: totalVentas,
      ingresos: totalIngresos,
      unidadesVendidas: Number(unitsResult[0][0].unidades_vendidas),
      ticketPromedio: totalVentas ? totalIngresos / totalVentas : 0
    },
    ventasMensuales: monthly.map(item => ({
      mes: item.mes,
      ventas: Number(item.ventas)
    })),
    productosMasVendidos: topProducts.map(item => ({
      id: item.id_producto,
      nombre: item.nombre,
      unidades: Number(item.unidades)
    })),
    productosPorCategoria: categories.map(item => ({
      categoria: item.categoria,
      productos: Number(item.productos)
    })),
    ingresosPorPeriodo: monthly.map(item => ({
      mes: item.mes,
      ingresos: Number(item.ingresos)
    }))
  });
}));

app.use('/api/:t', (req, res, next) => PK[req.params.t] ? next() : res.status(404).json({ error: 'Tabla no válida' }));

async function columns(t) {
  const [r] = await pool.query(`SELECT column_name AS name, extra FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ordinal_position`, [t]);
  return r.map(c => ({ name: c.name, auto: /auto_increment/i.test(c.extra) }));
}
app.get('/api/:t/meta', wrap(async (req, res) => res.json({ pk: PK[req.params.t], columns: await columns(req.params.t) })));
app.get('/api/:t', wrap(async (req, res) =>
  res.json(await run(req, `SELECT * FROM \`${req.params.t}\` ORDER BY \`${PK[req.params.t]}\``))));

async function usable(t, body) {
  const ok = (await columns(t)).filter(c => !c.auto).map(c => c.name);
  return Object.keys(body).filter(k => ok.includes(k) && body[k] !== '');
}
app.post('/api/:t', wrap(async (req, res) => {
  const t = req.params.t, k = await usable(t, req.body);
  const r = k.length ? await run(req, `INSERT INTO \`${t}\`(${k.map(x => `\`${x}\``).join(',')}) VALUES (${k.map(() => '?').join(',')})`, k.map(x => req.body[x]))
                     : await run(req, `INSERT INTO \`${t}\` () VALUES ()`);
  res.status(201).json({ ok: true, id: r.insertId });
}));
app.put('/api/:t/:id', wrap(async (req, res) => {
  const t = req.params.t, k = await usable(t, req.body);
  await run(req, `UPDATE \`${t}\` SET ${k.map(c => `\`${c}\`=?`).join(',')} WHERE \`${PK[t]}\`=?`, [...k.map(x => req.body[x]), req.params.id]);
  res.json({ ok: true });
}));
app.delete('/api/:t/:id', wrap(async (req, res) => {
  await run(req, `DELETE FROM \`${req.params.t}\` WHERE \`${PK[req.params.t]}\`=?`, [req.params.id]);
  res.json({ ok: true });
}));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`http://localhost:${port}`));