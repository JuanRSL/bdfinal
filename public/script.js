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
    dashboard: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    categorias: '<path d="M13 13.74a2 2 0 0 1-2 0L2.5 8.87a1 1 0 0 1 0-1.74L11 2.26a2 2 0 0 1 2 0l8.5 4.87a1 1 0 0 1 0 1.74z"/><path d="m20 14.285 1.5.845a1 1 0 0 1 0 1.74L13 21.74a2 2 0 0 1-2 0l-8.5-4.87a1 1 0 0 1 0-1.74l1.5-.845"/>',
    productos: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><polyline points="3.29 7 12 12 20.71 7"/><path d="m7.5 4.27 9 5.15"/>',
    clientes: '<path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>',
    ventas: '<path d="M12 16v5"/><path d="M16 14.639V21"/><path d="M20 10.656V21"/><path d="m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15"/><path d="M4 18.463V21"/><path d="M8 14.656V21"/>',
    detalle_ventas: '<path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/>',
    auditoria: '<path d="M3 12a9 9 0 1 0 2.12-5.88L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    check: '<circle cx="12" cy="12" r="10"/><path d="m16 9-5.5 5.5L8 12"/>',
    alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'
};

const NAV_GROUPS = [
    { label: 'General', items: ['dashboard'] },
    { label: 'Gestión', items: ['categorias', 'productos', 'clientes', 'ventas', 'detalle_ventas'] },
    { label: 'Control', items: ['auditoria'] }
];

const STATS = [
    { key: 'categorias', label: 'Categorías' },
    { key: 'productos', label: 'Productos' },
    { key: 'clientes', label: 'Clientes' },
    { key: 'ventas', label: 'Ventas' }
];

let cur = 'dashboard';
let meta = null;
let editId = null;
let pendingDeleteId = null;
let deleteFocusTarget = null;
let analyticsCharts = [];
let toastTimeout = null;

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

$('nav').innerHTML = NAV_GROUPS.map(group =>
    `<div class="nav-group">
        <span class="nav-section-label">${group.label}</span>
        ${group.items.map(t =>
            `<div class="nav-item">
                <button class="nav-link" type="button" data-t="${t}">
                    <span class="nav-link-icon" aria-hidden="true">
                        <svg class="lucide-icon" viewBox="0 0 24 24">${ICONS[t]}</svg>
                    </span>
                    <span>${LABELS[t]}</span>
                </button>
            </div>`
        ).join('')}
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

    $('stats').classList.remove('row', 'row-cards');
    $('stats').classList.add('counts-band');
    $('stats').innerHTML = values.map(item =>
        `<div class="count-item">
            <span class="count-icon" aria-hidden="true">
                <svg class="lucide-icon" viewBox="0 0 24 24">${ICONS[item.key]}</svg>
            </span>
            <div class="count-copy">
                <span class="count-label">${item.label}</span>
                <strong class="count-value">${item.count.toLocaleString('es-CO')}</strong>
                <span class="count-caption">registros actuales</span>
            </div>
        </div>`
    ).join('');
}

function updateStats() {
    refreshStats().catch(e => {
        $('stats').classList.remove('counts-band');
        $('stats').classList.add('row', 'row-cards');
        $('stats').innerHTML =
            `<div class="col-12">
                <div class="alert alert-warning mb-0" role="alert">
                    No se pudieron actualizar los indicadores: ${esc(e.message)}
                </div>
            </div>`;
    });
}

async function load() {
    const isDashboard = cur === 'dashboard';
    $('form').classList.toggle('dashboard-controls', isDashboard);
    $('out').classList.toggle('dashboard-results', isDashboard);

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
        showToast(e.message, 'error');
    }
}

function showToast(message, type = 'success') {
    const region = $('toast-region');
    const toast = document.createElement('div');
    const icon = type === 'error' ? ICONS.alert : ICONS.check;

    clearTimeout(toastTimeout);
    region.replaceChildren();
    toast.className = `toast-message toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.innerHTML =
        `<span class="toast-icon" aria-hidden="true">
            <svg class="lucide-icon" viewBox="0 0 24 24">${icon}</svg>
        </span>
        <span class="toast-copy"></span>
        <button class="toast-close" type="button" aria-label="Cerrar notificación">
            <svg class="lucide-icon" viewBox="0 0 24 24"><path d="m18 6-12 12M6 6l12 12"/></svg>
        </button>`;
    toast.querySelector('.toast-copy').textContent = message;
    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
    region.append(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));

    toastTimeout = setTimeout(() => {
        toast.classList.remove('is-visible');
        setTimeout(() => toast.remove(), 180);
    }, 4200);
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
                    onclick="loadAnalytics().catch(e => showToast(e.message, 'error'))">
                    <svg class="lucide-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS.refresh}</svg>
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
            <div class="loading-state" role="status">
                <span class="loading-spinner" aria-hidden="true"></span>
                Consultando datos de la tienda…
            </div>
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
    const panelClass = {
        'monthly-sales-chart': 'panel-monthly-sales',
        'income-chart': 'panel-income',
        'top-products-chart': 'panel-top-products',
        'category-chart': 'panel-category'
    }[id];

    return `<section class="analytics-panel ${panelClass}" aria-labelledby="${id}-title">
        <header class="analytics-panel-header">
            <div>
                <h3 class="analytics-panel-title" id="${id}-title">${title}</h3>
                <p class="panel-subtitle">${subtitle}</p>
            </div>
        </header>
        <div class="analytics-panel-body">
            ${hasData
                ? `<div class="analytics-chart" id="${id}" role="img" aria-label="${title}: ${subtitle}"></div>`
                : `<div class="chart-empty">${emptyMessage}</div>`}
        </div>
    </section>`;
}

async function renderAnalytics(data) {
    const summary = data.resumen;
    const metrics = [
        { label: 'Ingresos del período', value: formatNumber(summary.ingresos) },
        { label: 'Ventas realizadas', value: formatNumber(summary.ventas) },
        { label: 'Unidades vendidas', value: formatNumber(summary.unidadesVendidas) },
        { label: 'Ticket promedio', value: formatNumber(summary.ticketPromedio) }
    ];
    const sales = data.ventasMensuales;
    const topProducts = data.productosMasVendidos;
    const categories = data.productosPorCategoria;
    const income = data.ingresosPorPeriodo;
    const styles = getComputedStyle(document.documentElement);
    const chartColors = [
        '--chart-primary',
        '--chart-secondary',
        '--chart-tertiary',
        '--chart-quaternary',
        '--chart-quinary',
        '--chart-senary',
        '--chart-septenary'
    ].map(token => styles.getPropertyValue(token).trim());
    const axisColor = styles.getPropertyValue('--text-muted').trim();
    const gridColor = styles.getPropertyValue('--border-subtle').trim();
    const sharedAxis = {
        labels: { style: { colors: axisColor, fontSize: '11px' } }
    };

    $('out').innerHTML =
        `<section class="period-overview" aria-label="Indicadores del período">
            <div class="overview-primary">
                <span class="overview-label">${metrics[0].label}</span>
                <strong class="overview-value">${metrics[0].value}</strong>
                <span class="overview-period">${data.periodo.desde} — ${data.periodo.hasta}</span>
            </div>
            <div class="overview-secondary">
                ${metrics.slice(1).map((metric, index) =>
                    `<div class="overview-metric">
                        <span class="overview-label">${metric.label}</span>
                        <strong class="overview-secondary-value">${metric.value}</strong>
                        <span class="overview-note">${index === 2 ? 'Promedio por venta' : 'En el período'}</span>
                    </div>`
                ).join('')}
            </div>
        </section>
        <div class="analytics-grid">
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
        </div>`;

    const monthLabels = sales.map(item => formatMonth(item.mes));
    const charts = [];

    if (sales.length) {
        charts.push({
            element: 'monthly-sales-chart',
            options: {
                series: [{ name: 'Ventas', data: sales.map(item => item.ventas) }],
                colors: [chartColors[0]],
                chart: {
                    type: 'bar',
                    height: 300,
                    toolbar: { show: false },
                    fontFamily: 'inherit',
                    animations: { enabled: true, easing: 'easeinout', speed: 650 }
                },
                plotOptions: { bar: { borderRadius: 6, columnWidth: '48%' } },
                dataLabels: { enabled: false },
                xaxis: { categories: monthLabels, ...sharedAxis },
                yaxis: { labels: { formatter: value => formatNumber(value), style: { colors: axisColor } } },
                grid: { borderColor: gridColor, strokeDashArray: 0 },
                tooltip: { y: { formatter: value => `${formatNumber(value)} ventas` } }
            }
        });
        charts.push({
            element: 'income-chart',
            options: {
                chart: {
                    type: 'area',
                    height: 300,
                    toolbar: { show: false },
                    fontFamily: 'inherit',
                    animations: { enabled: true, easing: 'easeinout', speed: 650 }
                },
                series: [{ name: 'Ingresos', data: income.map(item => item.ingresos) }],
                colors: [chartColors[1]],
                stroke: { curve: 'smooth', width: 3 },
                fill: { type: 'solid', opacity: 0.1 },
                markers: { size: 4, strokeWidth: 0 },
                dataLabels: { enabled: false },
                xaxis: { categories: income.map(item => formatMonth(item.mes)), ...sharedAxis },
                yaxis: { labels: { formatter: value => formatNumber(value), style: { colors: axisColor } } },
                grid: { borderColor: gridColor, strokeDashArray: 0 },
                tooltip: { y: { formatter: value => formatNumber(value) } }
            }
        });
    }

    if (topProducts.length) {
        charts.push({
            element: 'top-products-chart',
            options: {
                chart: {
                    type: 'bar',
                    height: 320,
                    toolbar: { show: false },
                    fontFamily: 'inherit',
                    animations: { enabled: true, easing: 'easeinout', speed: 650 }
                },
                series: [{ name: 'Unidades', data: topProducts.map(item => item.unidades) }],
                colors: [chartColors[2]],
                plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: '60%' } },
                dataLabels: { enabled: false },
                xaxis: {
                    categories: topProducts.map(item => item.nombre),
                    labels: { style: { colors: axisColor, fontSize: '11px' } }
                },
                yaxis: { labels: { maxWidth: 170, style: { colors: axisColor, fontSize: '11px' } } },
                grid: { borderColor: gridColor, strokeDashArray: 0 },
                tooltip: { y: { formatter: value => `${formatNumber(value)} unidades` } }
            }
        });
    }

    if (categories.length) {
        charts.push({
            element: 'category-chart',
            options: {
                chart: {
                    type: 'donut',
                    height: 320,
                    fontFamily: 'inherit',
                    animations: { enabled: true, easing: 'easeinout', speed: 650 }
                },
                series: categories.map(item => item.productos),
                labels: categories.map(item => item.categoria),
                colors: chartColors,
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
                        ${editId !== null
                            ? 'Guardar cambios'
                            : `<svg class="lucide-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS.plus}</svg> Agregar`}
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
            ? `<div class="table-toolbar">
                <label class="table-search">
                    <span class="visually-hidden">Buscar en ${LABELS[cur].toLowerCase()}</span>
                    <svg class="lucide-icon search-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS.search}</svg>
                    <input class="form-control form-control-sm" id="table-search" type="search"
                        placeholder="Buscar por cualquier campo" autocomplete="off">
                </label>
                <span class="table-count" id="table-count" aria-live="polite"></span>
            </div>
            <div class="table-responsive">
                <table class="table table-vcenter table-card table-striped">
                    <thead>
                        <tr>
                            ${meta.columns.map(c => `<th scope="col">${esc(c.name)}</th>`).join('')}
                            <th scope="col">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(r =>
                            `<tr data-search="${esc(meta.columns.map(c => String(r[c.name] ?? '')).join(' '))}">
                                ${meta.columns.map(c =>
                                    `<td${c.name === meta.pk ? ' class="record-id"' : ''}>${esc(
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
                <div class="table-search-empty" id="table-search-empty" hidden>
                    No hay registros que coincidan con la búsqueda.
                </div>
            </div>`
            : `<div class="empty-state">
                <strong>Aún no hay registros</strong>
                <span>Agrega el primero usando el formulario de arriba.</span>
            </div>`}`;

    if (rows.length) setupTableSearch(rows.length);
}

function setupTableSearch(total) {
    const input = $('table-search');
    const rows = [...$('out').querySelectorAll('tbody tr')];
    const count = $('table-count');
    const empty = $('table-search-empty');

    input.addEventListener('input', () => {
        const query = input.value.trim().toLocaleLowerCase('es');
        let visible = 0;

        rows.forEach(row => {
            const matches = row.dataset.search.toLocaleLowerCase('es').includes(query);
            row.hidden = !matches;
            if (matches) visible++;
        });

        count.textContent = `Mostrando ${visible} de ${total} ${total === 1 ? 'registro' : 'registros'}`;
        empty.hidden = visible > 0;
    });

    input.dispatchEvent(new Event('input'));
}

async function save() {
    const body = {};

    document.querySelectorAll('#form input').forEach(i =>
        body[i.name] = i.value
    );

    try {
        const wasEditing = Boolean(editId);
        if (editId) {
            await api(`/api/${cur}/${editId}`, 'PUT', body);
        } else {
            await api(`/api/${cur}`, 'POST', body);
        }

        editId = null;
        await load();
        updateStats();
        showToast(wasEditing ? 'Cambios guardados.' : 'Registro agregado.');
    } catch (e) {
        showToast(e.message, 'error');
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
        showToast('Registro eliminado.');
    } catch (e) {
        showToast(e.message, 'error');
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
                        ${T.slice(1, 6).map(t => `<option value="${t}">${LABELS[t]}</option>`)}
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
                        onclick="runAudit().catch(e => showToast(e.message, 'error'))">
                        <svg class="lucide-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS.search}</svg>
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
            ? `<div class="table-toolbar">
                <label class="table-search">
                    <span class="visually-hidden">Buscar en la auditoría</span>
                    <svg class="lucide-icon search-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS.search}</svg>
                    <input class="form-control form-control-sm" id="table-search" type="search"
                        placeholder="Buscar en la actividad" autocomplete="off">
                </label>
                <span class="table-count" id="table-count" aria-live="polite"></span>
            </div>
            <div class="table-responsive">
                <table class="table table-vcenter table-card table-striped audit-table">
                    <thead>
                        <tr>
                            <th scope="col">Fecha</th>
                            <th scope="col">Usuario</th>
                            <th scope="col">Tabla</th>
                            <th scope="col">Operación</th>
                            <th scope="col">ID</th>
                            <th scope="col">Datos anteriores</th>
                            <th scope="col">Datos nuevos</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(r =>
                            `<tr data-search="${esc([
                                r.fecha,
                                r.usuario,
                                LABELS[r.tabla] || r.tabla,
                                r.operacion,
                                r.id_registro,
                                JSON.stringify(r.datos_anteriores ?? ''),
                                JSON.stringify(r.datos_nuevos ?? '')
                            ].join(' '))}">
                                <td>${esc(new Date(r.fecha).toLocaleString())}</td>
                                <td>${esc(r.usuario)}</td>
                                <td>${esc(LABELS[r.tabla] || r.tabla)}</td>
                                <td><span class="badge operation-badge operation-${esc(String(r.operacion).toLowerCase())}">${esc(r.operacion)}</span></td>
                                <td>${esc(r.id_registro)}</td>
                                <td><pre>${esc(r.datos_anteriores && JSON.stringify(r.datos_anteriores))}</pre></td>
                                <td><pre>${esc(r.datos_nuevos && JSON.stringify(r.datos_nuevos))}</pre></td>
                            </tr>`
                        ).join('')}
                    </tbody>
                </table>
                <div class="table-search-empty" id="table-search-empty" hidden>
                    No hay cambios que coincidan con la búsqueda.
                </div>
            </div>`
            : `<div class="empty-state">
                <strong>No hay cambios para mostrar</strong>
                <span>Prueba con otro periodo o ajusta los filtros seleccionados.</span>
            </div>`}`;

    if (rows.length) setupTableSearch(rows.length);
}

load();
updateStats();
