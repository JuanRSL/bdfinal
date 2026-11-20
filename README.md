# Gestión de tienda

Aplicación web para administrar una tienda con **Node.js**, **Express** y **MySQL**. La interfaz utiliza **Tabler UI** y **ApexCharts**, y está implementada con JavaScript nativo.

## Funcionalidades

- Operaciones CRUD para categorías, productos, clientes, ventas y detalle de ventas.
- Registro y consulta de auditoría. Los cambios se atribuyen al usuario indicado en la interfaz mediante `x-usuario` y `@app_usuario`.
- Dashboard con indicadores y gráficas de ventas mensuales, productos más vendidos, productos por categoría e ingresos por período.
- Filtro por fecha para consultar las estadísticas.
- Diseño adaptable a pantallas móviles.

Las estadísticas se calculan con datos de MySQL; la aplicación no incluye datos de demostración.

## Requisitos

- Node.js 20 o posterior y npm.
- MySQL en ejecución.
- Una base de datos ya creada con las tablas `categorias`, `productos`, `clientes`, `ventas` y `detalle_ventas`, además de la vista `v_auditoria` y los triggers utilizados para la auditoría.

> El proyecto no incluye un archivo para crear la base de datos. Configura o importa su esquema en MySQL antes de iniciar la aplicación.

## Instalación

Abre PowerShell en la carpeta del proyecto e instala las dependencias:

```powershell
npm.cmd ci
```

Crea un archivo llamado `.env` en la carpeta raíz del proyecto y agrega la configuración de tu instancia MySQL:

```dotenv
DB_HOST=localhost
DB_USER=root
DB_PASS=escribe_aqui_tu_contraseña
DB_NAME=rs_tienda
PORT=3000
```

Reemplaza `DB_USER`, `DB_PASS` y `DB_NAME` por los valores de tu entorno. No compartas ni subas `.env`: está excluido por `.gitignore`. Para un entorno real, es preferible usar un usuario de MySQL con los permisos mínimos necesarios en lugar de `root`.

Inicia el servidor:

```powershell
npm.cmd start
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador. Para detener el servidor, usa `Ctrl+C` en la terminal.

En Windows, se usa `npm.cmd` para evitar restricciones de ejecución de scripts de PowerShell. En otras terminales, los comandos equivalentes son `npm ci` y `npm start`.

## API

Las rutas CRUD disponibles para `categorias`, `productos`, `clientes`, `ventas` y `detalle_ventas` son:

| Método | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/api/:tabla/meta` | Consulta la clave primaria y columnas de la tabla |
| `GET` | `/api/:tabla` | Lista registros |
| `POST` | `/api/:tabla` | Crea un registro |
| `PUT` | `/api/:tabla/:id` | Actualiza un registro |
| `DELETE` | `/api/:tabla/:id` | Elimina un registro |

Otras rutas:

| Método | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/api/auditoria` | Consulta el historial; acepta `desde`, `hasta`, `tabla` y `operacion` |
| `GET` | `/api/estadisticas/dashboard?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` | Devuelve los agregados reales usados por el dashboard |

El endpoint de estadísticas devuelve el resumen del período, ventas e ingresos mensuales, productos más vendidos y distribución actual de productos por categoría. Si se omiten las fechas, consulta los últimos doce meses hasta la fecha actual.

## Estructura principal

```text
.
├── public/
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── server.js
```

Las bibliotecas de interfaz se instalan localmente desde npm y Express las sirve desde `node_modules`; no se requiere un CDN.
