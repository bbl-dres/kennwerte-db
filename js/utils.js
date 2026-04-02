/* kennwerte-db — Shared utilities, formatting, and application state */

// === Shared State (mutable, accessed by all modules) ===
const App = {
    db: null,
    map: null,
    mapMarkers: [],
    currentView: 'gallery',
    searchQuery: '',
    filters: {},
    allProjects: [],
    filteredProjects: [],
    sortCol: 'completion_year',
    sortDir: 'desc',
    filterOptions: {},
    detailReturnParams: '',
    renderLimit: 60,
};

// === Formatting ===
const CH = new Intl.NumberFormat('de-CH');
const fmtN = v => v != null ? CH.format(Math.round(v)) : '\u2014';
const fmtMio = v => v != null ? (v >= 1e6 ? `CHF ${(v / 1e6).toFixed(1)} Mio.` : `CHF ${fmtN(v)}`) : '\u2014';
const fmtArea = v => v != null ? `${fmtN(v)} m\u00B2` : '\u2014';
const fmtVol = v => v != null ? `${fmtN(v)} m\u00B3` : '\u2014';

// === Escape HTML ===
function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

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

const CATEGORY_ICONS = {
    verwaltung: 'business', bundeshaus: 'account_balance', ausland: 'public',
    bildung: 'science', sport: 'sports_soccer', kultur: 'museum', justiz: 'gavel',
    zoll: 'local_shipping', wohnen: 'home', parkanlagen: 'park', produktion: 'warehouse',
    technik: 'settings', verschiedenes: 'category', militaer: 'shield', hochbau: 'apartment',
};

// === Detail field (shared by detail + estimator) ===
function detailField(label, value, highlight) {
    const empty = value == null || value === '' || value === false;
    const cls = empty ? ' empty' : (highlight ? ' highlight' : '');
    return `<div class="detail-field">
        <span class="detail-field-label">${label}</span>
        <span class="detail-field-value${cls}">${empty ? 'Keine Angabe' : value}</span>
    </div>`;
}
