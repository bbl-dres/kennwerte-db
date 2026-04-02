/* kennwerte-db — Shared utilities, formatting, and application state */

// === Shared State (mutable, accessed by all modules) ===
const PAGE_SIZE = 30;

const App = {
    db: null,
    map: null,
    currentView: 'gallery',
    searchQuery: '',
    filters: {},
    allProjects: [],
    filteredProjects: [],
    sortCol: 'completion_year',
    sortDir: 'desc',
    filterOptions: {},
    detailReturnParams: '',
    page: 1,
};

// === Formatting ===
const EMPTY = '<span class="empty-val">Keine Angabe</span>';
const CH = new Intl.NumberFormat('de-CH');
const fmtN = v => v != null ? CH.format(Math.round(v)) : EMPTY;
const fmtMio = v => v != null ? (v >= 1e6 ? `CHF ${(v / 1e6).toFixed(1)} Mio.` : `CHF ${fmtN(v)}`) : EMPTY;
const fmtArea = v => v != null ? `${fmtN(v)} m\u00B2` : EMPTY;
const fmtVol = v => v != null ? `${fmtN(v)} m\u00B3` : EMPTY;

// === Escape HTML (reuse single element for performance) ===
const _escEl = document.createElement('div');
function esc(s) { _escEl.textContent = s || ''; return _escEl.innerHTML; }

// === Statistics (shared by dashboard, peer comparison, estimator) ===
function percentile(arr, p) {
    if (!arr.length) return null;
    const i = (p / 100) * (arr.length - 1);
    const lo = Math.floor(i);
    return lo === Math.ceil(i) ? arr[lo] : arr[lo] + (arr[Math.ceil(i)] - arr[lo]) * (i - lo);
}

function computeStats(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return { min: sorted[0], p25: percentile(sorted, 25), median: percentile(sorted, 50), p75: percentile(sorted, 75), max: sorted[sorted.length - 1] };
}

function renderBoxPlot(stats, markerValue) {
    const range = stats.max - stats.min || 1;
    const pos = v => ((v - stats.min) / range) * 100;
    return `<div class="box-plot">
        <div class="box-plot-whisker" style="left:${pos(stats.min)}%;width:${pos(stats.max) - pos(stats.min)}%"></div>
        <div class="box-plot-box" style="left:${pos(stats.p25)}%;width:${pos(stats.p75) - pos(stats.p25)}%"></div>
        <div class="box-plot-median" style="left:${pos(stats.median)}%"></div>
        ${markerValue != null ? `<div class="box-plot-marker" style="left:${pos(markerValue)}%" title="${fmtN(markerValue)}"></div>` : ''}
    </div>
    <div class="box-plot-labels">
        <span>${fmtN(stats.min)}</span><span>P25: ${fmtN(stats.p25)}</span><span>Median: ${fmtN(stats.median)}</span><span>P75: ${fmtN(stats.p75)}</span><span>${fmtN(stats.max)}</span>
    </div>`;
}

// === Tag helpers ===
function tagHTML(art) {
    const m = { NEUBAU: ['Neubau', 'tag-neubau'], UMBAU_SANIERUNG: ['Sanierung', 'tag-sanierung'],
        UMBAU: ['Umbau', 'tag-umbau'], UMBAU_ERWEITERUNG: ['Erweiterung', 'tag-erweiterung'],
        UMBAU_TEILABBRUCH: ['Teilabbruch', 'tag-umbau'], ABBRUCH: ['Abbruch', 'tag-umbau'] };
    const [label, cls] = m[art] || [art || '?', ''];
    return `<span class="tag ${cls}">${label}</span>`;
}

function srcTagHTML(src) {
    const m = { bbl: ['BBL', 'tag-bbl'], armasuisse: ['armasuisse', 'tag-armasuisse'],
        'stadt-zuerich': ['Stadt ZH', 'tag-stadt-zuerich'] };
    const [label, cls] = m[src] || [src || '?', ''];
    return `<span class="tag tag-src ${cls}">${label}</span>`;
}

function srcClass(src) {
    return 'src-' + (src || 'bbl');
}

// === Display helpers ===
function displayName(p) {
    let name = (p.project_name || '').replace(/_/g, ', ');
    const muni = (p.municipality || '').replace(/_/g, ', ');
    if (muni && name.startsWith(muni + ', ')) {
        name = name.slice(muni.length + 2);
    } else if (muni && name.startsWith(muni)) {
        name = name.slice(muni.length).replace(/^[,\s]+/, '');
    }
    return name || p.project_name || '';
}

function displayMuni(p) {
    return (p.municipality || '').replace(/_/g, ', ');
}

function completenessClass(p) {
    if (p.chf_per_m2_gf) return 'data-complete';
    if (p.construction_cost_total || p.gf_m2) return 'data-partial';
    return 'data-minimal';
}

const BKP_STRUCTURE = [
    { code: '1', name: 'Vorbereitungsarbeiten', main: true },
    { code: '2', name: 'Gebäude', main: true },
    { code: '20', name: 'Baugrube' },
    { code: '21', name: 'Rohbau 1' },
    { code: '22', name: 'Rohbau 2' },
    { code: '23', name: 'Elektroanlagen' },
    { code: '24', name: 'HLKK-Anlagen' },
    { code: '25', name: 'Sanitäranlagen' },
    { code: '26', name: 'Transportanlagen' },
    { code: '27', name: 'Ausbau 1' },
    { code: '28', name: 'Ausbau 2' },
    { code: '29', name: 'Honorare' },
    { code: '4', name: 'Umgebung', main: true },
    { code: '5', name: 'Baunebenkosten', main: true },
    { code: '9', name: 'Ausstattung', main: true },
];

const ARBEITEN_TYPES = [
    { value: 'NEUBAU', label: 'Neubau' }, { value: 'UMBAU_SANIERUNG', label: 'Sanierung' },
    { value: 'UMBAU', label: 'Umbau' }, { value: 'UMBAU_ERWEITERUNG', label: 'Erweiterung' }
];

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

const CATEGORY_ICONS = {
    verwaltung: 'business', bundeshaus: 'account_balance', ausland: 'public',
    bildung: 'science', sport: 'sports_soccer', kultur: 'museum', justiz: 'gavel',
    zoll: 'local_shipping', wohnen: 'home', parkanlagen: 'park', produktion: 'warehouse',
    technik: 'settings', verschiedenes: 'category', militaer: 'shield', hochbau: 'apartment',
};

// === Pagination ===
function getPage(items) {
    const start = (App.page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
}

function renderPagination(totalItems, containerId, onPageChange) {
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);
    const el = document.getElementById(containerId);
    if (!el || totalPages <= 1) { if (el) el.innerHTML = ''; return; }

    const page = App.page;
    const pages = [];
    // Always show first, last, current, and neighbors
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
            pages.push(i);
        } else if (pages[pages.length - 1] !== '...') {
            pages.push('...');
        }
    }

    el.innerHTML = `<div class="pagination">
        <button class="pagination-btn" ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}">
            <span class="material-icons-outlined">chevron_left</span>
        </button>
        ${pages.map(p => p === '...'
            ? '<span class="pagination-ellipsis">\u2026</span>'
            : `<button class="pagination-btn${p === page ? ' active' : ''}" data-page="${p}">${p}</button>`
        ).join('')}
        <button class="pagination-btn" ${page >= totalPages ? 'disabled' : ''} data-page="${page + 1}">
            <span class="material-icons-outlined">chevron_right</span>
        </button>
        <span class="pagination-info">${(page-1)*PAGE_SIZE+1}\u2013${Math.min(page*PAGE_SIZE, totalItems)} von ${totalItems}</span>
    </div>`;
    // Delegation: wire once per container, re-use on subsequent renders
    if (!el.dataset.wired) {
        el.dataset.wired = '1';
        el.addEventListener('click', e => {
            const btn = e.target.closest('.pagination-btn[data-page]');
            if (!btn || btn.disabled) return;
            const pg = parseInt(btn.dataset.page);
            if (pg >= 1) { App.page = pg; onPageChange(); }
        });
    }
}

// === Detail field (shared by detail + estimator) ===
function detailField(label, value, highlight) {
    const empty = value == null || value === '' || value === false;
    const cls = empty ? ' empty' : (highlight ? ' highlight' : '');
    return `<div class="detail-field">
        <span class="detail-field-label">${label}</span>
        <span class="detail-field-value${cls}">${empty ? 'Keine Angabe' : value}</span>
    </div>`;
}
