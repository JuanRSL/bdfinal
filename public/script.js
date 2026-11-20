const T = [
    'dashboard',
    'categorias',
    'productos',
    'clientes',
    'ventas',
    'detalle_ventas',
    'auditoria'
];

const LABELS = {
    dashboard: 'Dashboard',
    categorias: 'Categorías',
    productos: 'Productos',
    clientes: 'Clientes',
    ventas: 'Ventas',
    detalle_ventas: 'Detalle de ventas',
    auditoria: 'Auditoría'
};

const DESCRIPTIONS = {
    dashboard: 'Analiza ventas, productos e ingresos con información de tu base de datos.',
    categorias: 'Administra las categorías de productos de tu tienda.',
    productos: 'Consulta y mantiene actualizado el catálogo de productos.',
    clientes: 'Gestiona la información de los clientes de tu tienda.',
    ventas: 'Consulta y administra las ventas registradas.',
    detalle_ventas: 'Revisa los productos asociados a cada venta.',
    auditoria: 'Consulta los cambios realizados en la base de datos.'
};

const ICONS = {
    dashboard: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-5 5"/>',
    categorias: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
    productos: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
    clientes: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    ventas: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-5 5"/>',
    detalle_ventas: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
    auditoria: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'
};

const STATS = [
    { key: 'categorias', label: 'Categorías', tone: 'bg-azure-lt text-azure' },
    { key: 'productos', label: 'Productos', tone: 'bg-indigo-lt text-indigo' },
    { key: 'clientes', label: 'Clientes', tone: 'bg-teal-lt text-teal' },
    { key: 'ventas', label: 'Ventas', tone: 'bg-orange-lt text-orange' }
];

let cur = 'dashboard';
let meta = null;
let editId = null;
let pendingDeleteId = null;
let deleteFocusTarget = null;
let analyticsCharts = [];

const $ = id => document.getElementById(id);

const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
}[c]));

async function api(url, m = 'GET', body) {
    const r = await fetch(url, {
        method: m,
        headers: {
            'Content-Type': 'application/json',
            'x-usuario': $('user').value
        },
        body: body && JSON.stringify(body)
    });

    const j = await r.json();

    if (!r.ok) throw new Error(j.error);

    return j;
}

$('nav').innerHTML = T.map(t =>
    `<div class="nav-item">
        <button class="nav-link" type="button" data-t="${t}">
            <span class="nav-link-icon d-md-none d-lg-inline-block">
                <svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[t]}</svg>
            </span>
            <span>${LABELS[t]}</span>
        </button>
    </div>`
).join('');

$('nav').onclick = e => {
    const button = e.target.closest('button[data-t]');
    if (button) {
        cur = button.dataset.t;
        editId = null;
        load();

        if (window.matchMedia('(max-width: 991.98px)').matches) {
            $('sidebar-menu').classList.remove('show');
            document.querySelector('.navbar-toggler').setAttribute('aria-expanded', 'false');
        }
    }
};

async function refreshStats() {
    const values = await Promise.all(STATS.map(async item => {
        const rows = await api(`/api/${item.key}`);
        return { ...item, count: rows.length };
    }));

    $('stats').innerHTML = values.map(item =>
        `<div class="col-sm-6 col-lg-3">
            <div class="card card-sm">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <span class="stat-icon ${item.tone}">
                                <svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[item.key]}</svg>
                            </span>
                        </div>
                        <div class="col">
                            <div class="subheader">${item.label}</div>
                            <div class="stat-value">${item.count.toLocaleString('es-CO')}</div>
                            <div class="text-secondary small">Registros actuales</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`
    ).join('');
}

function updateStats() {
    refreshStats().catch(e => {
        $('stats').innerHTML =
            `<div class="col-12">
                <div class="alert alert-warning mb-0" role="alert">
                    No se pudieron actualizar los indicadores: ${esc(e.message)}
                </div>
            </div>`;
    });
}

async function load() {
    document.querySelectorAll('#nav .nav-link').forEach(b => {
        const active = b.dataset.t === cur;
        b.classList.toggle('active', active);
        if (active) b.setAttribute('aria-current', 'page');
        else b.removeAttribute('aria-current');
    });

    $('breadcrumb-current').textContent = LABELS[cur];
    $('page-title').textContent = LABELS[cur];
    $('page-description').textContent = DESCRIPTIONS[cur];
    if (cur !== 'dashboard') destroyAnalyticsCharts();

    try {
        if (cur === 'dashboard') await dashboard();
        else if (cur === 'auditoria') await audit();
        else await crud();
    } catch (e) {
        alert(e.message);
    }
}

function formatLocalDate(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
    ].join('-');
}

function defaultAnalyticsRange() {
    const now = new Date();
    return {
        desde: formatLocalDate(new Date(now.getFullYear(), now.getMonth() - 11, 1)),
        hasta: formatLocalDate(now)
    };
}

async function dashboard() {
    const { desde, hasta } = defaultAnalyticsRange();

    $('form').innerHTML =
        `<div class="card-header">
            <div>
                <h3 class="card-title">Análisis de la tienda</h3>
                <div class="panel-subtitle">Indicadores calculados a partir de ventas, productos y categorías en MySQL.</div>
            </div>
            <span class="badge bg-blue-lt">Datos en vivo</span>
        </div>
        <div class="card-body">
            <div class="analytics-filters">
                <label class="field">
                    <span class="form-label">Desde</span>
                    <input class="form-control" type="date" id="analytics-from" value="${desde}">
                </label>
                <label class="field">
                    <span class="form-label">Hasta</span>
                    <input class="form-control" type="date" id="analytics-to" value="${hasta}">
                </label>
                <button class="btn btn-primary" type="button"
                    onclick="loadAnalytics().catch(e => alert(e.message))">
                    Actualizar dashboard
                </button>
            </div>
        </div>`;

    await loadAnalytics();
}

function destroyAnalyticsCharts() {
    analyticsCharts.forEach(chart => chart.destroy());
    analyticsCharts = [];
}

function formatNumber(value) {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value);
}

function formatMonth(value) {
    const [year, month] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('es-CO', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC'
    }).format(new Date(Date.UTC(year, month - 1, 1)));
}

async function loadAnalytics() {
    destroyAnalyticsCharts();
    $('out').innerHTML =
        `<div class="card-body">
            <div class="empty-state">Consultando datos reales de MySQL…</div>
        </div>`;

    const query = new URLSearchParams({
        desde: $('analytics-from').value,
        hasta: $('analytics-to').value
    });

    try {
        const data = await api(`/api/estadisticas/dashboard?${query}`);
        await renderAnalytics(data);
    } catch (e) {
        $('out').innerHTML =
            `<div class="card-body">
                <div class="alert alert-danger mb-0" role="alert">
                    No se pudo cargar el dashboard: ${esc(e.message)}
                </div>
            </div>`;
        throw e;
    }
}

function analyticsChartCard(title, subtitle, id, hasData, emptyMessage) {
    return `<div class="col-12 col-xl-6">
        <div class="card analytics-chart-card h-100">
            <div class="card-header">
                <div>
                    <h3 class="card-title">${title}</h3>
                    <div class="panel-subtitle">${subtitle}</div>
                </div>
            </div>
            <div class="card-body">
                ${hasData
                    ? `<div class="analytics-chart" id="${id}"></div>`
                    : `<div class="chart-empty">${emptyMessage}</div>`}
            </div>
        </div>
    </div>`;
}

async function renderAnalytics(data) {
    const summary = data.resumen;
    const metrics = [
        { label: 'Ingresos del período', value: formatNumber(summary.ingresos), tone: 'bg-green-lt text-green', icon: ICONS.ventas },
        { label: 'Ventas realizadas', value: formatNumber(summary.ventas), tone: 'bg-blue-lt text-blue', icon: ICONS.detalle_ventas },
        { label: 'Unidades vendidas', value: formatNumber(summary.unidadesVendidas), tone: 'bg-purple-lt text-purple', icon: ICONS.productos },
        { label: 'Ticket promedio', value: formatNumber(summary.ticketPromedio), tone: 'bg-orange-lt text-orange', icon: ICONS.dashboard }
    ];
    const sales = data.ventasMensuales;
    const topProducts = data.productosMasVendidos;
    const categories = data.productosPorCategoria;
    const income = data.ingresosPorPeriodo;

    $('out').innerHTML =
        `<div class="card-body">
            <div class="row row-cards mb-3">
                ${metrics.map(metric =>
                    `<div class="col-sm-6 col-xl-3">
                        <div class="card card-sm">
                            <div class="card-body">
                                <div class="row align-items-center">
                                    <div class="col-auto">
                                        <span class="stat-icon ${metric.tone}">
                                            <svg viewBox="0 0 24 24" aria-hidden="true">${metric.icon}</svg>
                                        </span>
                                    </div>
                                    <div class="col">
                                        <div class="subheader">${metric.label}</div>
                                        <div class="stat-value">${metric.value}</div>
                                        <div class="text-secondary small">${data.periodo.desde} — ${data.periodo.hasta}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`
                ).join('')}
            </div>
            <div class="row row-cards">
                ${analyticsChartCard(
                    'Ventas mensuales',
                    'Cantidad de ventas por mes',
                    'monthly-sales-chart',
                    sales.length > 0,
                    'No hay ventas registradas para este período.'
                )}
                ${analyticsChartCard(
                    'Ingresos por período',
                    'Ingresos mensuales provenientes de ventas',
                    'income-chart',
                    income.length > 0,
                    'No hay ingresos registrados para este período.'
                )}
                ${analyticsChartCard(
                    'Productos más vendidos',
                    'Unidades vendidas dentro del período seleccionado',
                    'top-products-chart',
                    topProducts.length > 0,
                    'No hay productos vendidos para este período.'
                )}
                ${analyticsChartCard(
                    'Productos por categoría',
                    'Distribución del catálogo actual',
                    'category-chart',
                    categories.length > 0,
                    'No hay productos para distribuir por categoría.'
                )}
            </div>
        </div>`;

    const monthLabels = sales.map(item => formatMonth(item.mes));
    const charts = [];

    if (sales.length) {
        charts.push({
            element: 'monthly-sales-chart',
            options: {
                chart: { type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
                series: [{ name: 'Ventas', data: sales.map(item => item.ventas) }],
                colors: ['#206bc4'],
                plotOptions: { bar: { borderRadius: 4, columnWidth: '48%' } },
                dataLabels: { enabled: false },
                xaxis: { categories: monthLabels },
                yaxis: { labels: { formatter: value => formatNumber(value) } },
                grid: { borderColor: '#e9ecef', strokeDashArray: 4 },
                tooltip: { y: { formatter: value => `${formatNumber(value)} ventas` } }
            }
        });
        charts.push({
            element: 'income-chart',
            options: {
                chart: { type: 'line', height: 300, toolbar: { show: false }, fontFamily: 'inherit' },
                series: [{ name: 'Ingresos', data: income.map(item => item.ingresos) }],
                colors: ['#2fb344'],
                stroke: { curve: 'smooth', width: 3 },
                markers: { size: 4, strokeWidth: 0 },
                dataLabels: { enabled: false },
                xaxis: { categories: income.map(item => formatMonth(item.mes)) },
                yaxis: { labels: { formatter: value => formatNumber(value) } },
                grid: { borderColor: '#e9ecef', strokeDashArray: 4 },
                tooltip: { y: { formatter: value => formatNumber(value) } }
            }
        });
    }

    if (topProducts.length) {
        charts.push({
            element: 'top-products-chart',
            options: {
                chart: { type: 'bar', height: 320, toolbar: { show: false }, fontFamily: 'inherit' },
                series: [{ name: 'Unidades', data: topProducts.map(item => item.unidades) }],
                colors: ['#ae3ec9'],
                plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%' } },
                dataLabels: { enabled: false },
                xaxis: { categories: topProducts.map(item => item.nombre) },
                yaxis: { labels: { maxWidth: 170 } },
                grid: { borderColor: '#e9ecef', strokeDashArray: 4 },
                tooltip: { y: { formatter: value => `${formatNumber(value)} unidades` } }
            }
        });
    }

    if (categories.length) {
        charts.push({
            element: 'category-chart',
            options: {
                chart: { type: 'donut', height: 320, fontFamily: 'inherit' },
                series: categories.map(item => item.productos),
                labels: categories.map(item => item.categoria),
                colors: ['#206bc4', '#2fb344', '#f59f00', '#d63939', '#ae3ec9', '#0ca678', '#4299e1'],
                legend: { position: 'bottom' },
                dataLabels: { enabled: false },
                tooltip: { y: { formatter: value => `${formatNumber(value)} productos` } },
                plotOptions: { pie: { donut: { size: '68%' } } }
            }
        });
    }

    analyticsCharts = charts.map(item => new ApexCharts($(item.element), item.options));
    await Promise.all(analyticsCharts.map(chart => chart.render()));
}

async function crud() {
    meta = await api(`/api/${cur}/meta`);
    const rows = await api(`/api/${cur}`);
    const row = rows.find(r => r[meta.pk] == editId) || {};

    $('form').innerHTML =
        `<div class="card-header">
            <div>
                <h3 class="card-title">${editId !== null ? `Editar registro #${esc(editId)}` : `Nuevo registro de ${LABELS[cur].toLowerCase()}`}</h3>
                <div class="panel-subtitle">Completa los campos para ${editId !== null ? 'actualizar la información' : 'agregar un elemento'}.</div>
            </div>
            <span class="badge bg-secondary-lt">${rows.length} ${rows.length === 1 ? 'registro' : 'registros'}</span>
        </div>
        <div class="card-body">
            <div class="record-form">
                ${meta.columns
                    .filter(c => !c.auto)
                    .map(c =>
                        `<label class="field">
                            <span class="form-label">${esc(c.name)}</span>
                            <input class="form-control" name="${esc(c.name)}"
                                type="${c.name === 'fecha' ? 'date' : 'text'}"
                                placeholder="${esc(c.name)}"
                                value="${esc(
                                    c.name === 'fecha'
                                        ? String(row[c.name] ?? '').slice(0, 10)
                                        : row[c.name]
                                )}">
                        </label>`
                    ).join('')}
                <div class="form-actions">
                    <button class="btn btn-primary" type="button" onclick="save()">
                        ${editId !== null ? 'Guardar cambios' : '＋ Agregar'}
                    </button>
                    ${editId !== null
                        ? `<button class="btn btn-outline-secondary" type="button" onclick="editId=null;load()">Cancelar</button>`
                        : ''}
                </div>
            </div>
        </div>`;

    $('out').innerHTML =
        `<div class="card-header">
            <div>
                <h3 class="card-title">${LABELS[cur]}</h3>
                <div class="panel-subtitle">Registros disponibles en ${LABELS[cur].toLowerCase()}.</div>
            </div>
        </div>
        ${rows.length
            ? `<div class="table-responsive">
                <table class="table table-vcenter table-card table-striped">
                    <thead>
                        <tr>
                            ${meta.columns.map(c => `<th>${esc(c.name)}</th>`).join('')}
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(r =>
                            `<tr>
                                ${meta.columns.map(c =>
                                    `<td>${esc(
                                        c.name === 'fecha'
                                            ? String(r[c.name]).slice(0, 10)
                                            : r[c.name]
                                    )}</td>`
                                ).join('')}
                                <td class="actions-cell">
                                    <button class="btn btn-sm btn-outline-secondary" type="button"
                                        title="Editar" aria-label="Editar registro ${esc(r[meta.pk])}"
                                        onclick="editId=${r[meta.pk]};load()">Editar</button>
                                    <button class="btn btn-sm btn-outline-danger" type="button"
                                        title="Eliminar" aria-label="Eliminar registro ${esc(r[meta.pk])}"
                                        onclick="del(${r[meta.pk]})">Eliminar</button>
                                </td>
                            </tr>`
                        ).join('')}
                    </tbody>
                </table>
            </div>`
            : `<div class="empty-state">
                <strong>Aún no hay registros</strong>
                <span>Agrega el primero usando el formulario de arriba.</span>
            </div>`}`;
}

async function save() {
    const body = {};

    document.querySelectorAll('#form input').forEach(i =>
        body[i.name] = i.value
    );

    try {
        if (editId) {
            await api(`/api/${cur}/${editId}`, 'PUT', body);
        } else {
            await api(`/api/${cur}`, 'POST', body);
        }

        editId = null;
        await load();
        updateStats();
    } catch (e) {
        alert(e.message);
    }
}

async function del(id) {
    pendingDeleteId = id;
    $('delete-modal-description').textContent =
        `Se eliminará el registro #${id} de ${LABELS[cur].toLowerCase()}. Esta acción no se puede deshacer.`;
    openDeleteModal();
}

function openDeleteModal() {
    const modal = $('delete-modal');
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    backdrop.dataset.deleteBackdrop = 'true';
    deleteFocusTarget = document.activeElement;
    modal.classList.add('show');
    modal.style.display = 'block';
    modal.removeAttribute('aria-hidden');
    modal.setAttribute('aria-modal', 'true');
    document.body.classList.add('modal-open');
    document.body.appendChild(backdrop);
    $('confirm-delete').focus();
}

function closeDeleteModal() {
    const modal = $('delete-modal');

    modal.classList.remove('show');
    modal.style.display = 'none';
    modal.removeAttribute('aria-modal');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    document.querySelectorAll('[data-delete-backdrop]').forEach(backdrop => backdrop.remove());

    if (deleteFocusTarget && document.contains(deleteFocusTarget)) deleteFocusTarget.focus();
    deleteFocusTarget = null;
}

$('confirm-delete').onclick = async () => {
    if (pendingDeleteId === null) return;

    const id = pendingDeleteId;

    try {
        await api(`/api/${cur}/${id}`, 'DELETE');
        pendingDeleteId = null;
        closeDeleteModal();
        await load();
        updateStats();
    } catch (e) {
        alert(e.message);
    }
};

$('delete-modal').addEventListener('click', e => {
    if (e.target === $('delete-modal')) {
        pendingDeleteId = null;
        closeDeleteModal();
    }
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('delete-modal').classList.contains('show')) {
        pendingDeleteId = null;
        closeDeleteModal();
    }
});

document.querySelectorAll('[data-bs-dismiss="modal"]').forEach(button =>
    button.addEventListener('click', () => {
        pendingDeleteId = null;
        closeDeleteModal();
    })
);

async function audit() {
    const now = new Date();
    const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
    ].join('-');

    $('form').innerHTML =
        `<div class="card-header">
            <div>
                <h3 class="card-title">Filtros del reporte</h3>
                <div class="panel-subtitle">Define un periodo y filtra los cambios que quieres consultar.</div>
            </div>
        </div>
        <div class="card-body">
            <div class="audit-filters">
                <label class="field">
                    <span class="form-label">Desde</span>
                    <input class="form-control" type="date" id="d" value="${today}">
                </label>
                <label class="field">
                    <span class="form-label">Hasta</span>
                    <input class="form-control" type="date" id="h" value="${today}">
                </label>
                <label class="field">
                    <span class="form-label">Tabla</span>
                    <select class="form-select" id="tb">
                        <option value="">Todas las tablas</option>
                        ${T.slice(0, 5).map(t => `<option value="${t}">${LABELS[t]}</option>`)}
                    </select>
                </label>
                <label class="field">
                    <span class="form-label">Operación</span>
                    <select class="form-select" id="op">
                        <option value="">Todas</option>
                        <option>INSERT</option>
                        <option>UPDATE</option>
                        <option>DELETE</option>
                    </select>
                </label>
                <div class="form-actions">
                    <button class="btn btn-primary" type="button"
                        onclick="runAudit().catch(e => alert(e.message))">
                        Consultar reporte
                    </button>
                </div>
            </div>
        </div>`;

    await runAudit();
}

async function runAudit() {
    const q = new URLSearchParams({
        desde: $('d').value,
        hasta: $('h').value,
        tabla: $('tb').value,
        operacion: $('op').value
    });

    const rows = await api('/api/auditoria?' + q);

    $('out').innerHTML =
        `<div class="card-header">
            <div>
                <h3 class="card-title">Actividad registrada</h3>
                <div class="panel-subtitle">${rows.length} ${rows.length === 1 ? 'cambio encontrado' : 'cambios encontrados'} para los filtros seleccionados.</div>
            </div>
            <span class="badge bg-blue-lt">${rows.length} ${rows.length === 1 ? 'resultado' : 'resultados'}</span>
        </div>
        ${rows.length
            ? `<div class="table-responsive">
                <table class="table table-vcenter table-card table-striped audit-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Usuario</th>
                            <th>Tabla</th>
                            <th>Operación</th>
                            <th>ID</th>
                            <th>Datos anteriores</th>
                            <th>Datos nuevos</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(r =>
                            `<tr>
                                <td>${esc(new Date(r.fecha).toLocaleString())}</td>
                                <td>${esc(r.usuario)}</td>
                                <td>${esc(LABELS[r.tabla] || r.tabla)}</td>
                                <td><span class="badge bg-azure-lt">${esc(r.operacion)}</span></td>
                                <td>${esc(r.id_registro)}</td>
                                <td><pre>${esc(r.datos_anteriores && JSON.stringify(r.datos_anteriores))}</pre></td>
                                <td><pre>${esc(r.datos_nuevos && JSON.stringify(r.datos_nuevos))}</pre></td>
                            </tr>`
                        ).join('')}
                    </tbody>
                </table>
            </div>`
            : `<div class="empty-state">
                <strong>No hay cambios para mostrar</strong>
                <span>Prueba con otro periodo o ajusta los filtros seleccionados.</span>
            </div>`}`;
}

load();
updateStats();
