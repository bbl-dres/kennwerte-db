/* kennwerte-db — Main orchestrator: init, routing, filters, event wiring */

// === URL State ===
function getUrlParams() {
    const p = new URLSearchParams(window.location.search);
    return {
        view: p.get('view') || 'gallery',
        q: p.get('q') || '',
        src: p.get('src') || '',
        cat: p.get('cat') || '',
        canton: p.get('canton') || '',
        art: p.get('art') || '',
        yearFrom: p.get('yf') || '',
        yearTo: p.get('yt') || '',
        detail: p.get('detail') || '',
        estimator: p.get('estimator') || '',
    };
}

function updateUrl() {
    const p = new URLSearchParams();
    if (App.currentView !== 'gallery') p.set('view', App.currentView);
    if (App.searchQuery) p.set('q', App.searchQuery);
    if (App.filters.data_source?.size) p.set('src', [...App.filters.data_source].join(','));
    if (App.filters.category?.size) p.set('cat', [...App.filters.category].join(','));
    if (App.filters.canton?.size) p.set('canton', [...App.filters.canton].join(','));
    if (App.filters.arbeiten_type?.size) p.set('art', [...App.filters.arbeiten_type].join(','));
    if (App.filters.yearFrom) p.set('yf', App.filters.yearFrom);
    if (App.filters.yearTo) p.set('yt', App.filters.yearTo);
    const s = p.toString();
    window.history.replaceState({}, '', s ? `?${s}` : window.location.pathname);
}

function restoreFromUrl() {
    const p = getUrlParams();
    App.currentView = p.view;
    App.searchQuery = p.q;
    App.filters = {};
    if (p.src) App.filters.data_source = new Set(p.src.split(','));
    if (p.cat) App.filters.category = new Set(p.cat.split(','));
    if (p.canton) App.filters.canton = new Set(p.canton.split(','));
    if (p.art) App.filters.arbeiten_type = new Set(p.art.split(','));
    if (p.yearFrom) App.filters.yearFrom = p.yearFrom;
    if (p.yearTo) App.filters.yearTo = p.yearTo;
    document.getElementById('searchInput').value = App.searchQuery;
    if (p.detail) { showDetail(parseInt(p.detail)); return true; }
    if (p.estimator) { showEstimator(); return true; }
    return false;
}

// === Filter & Search ===
function applyFilters() {
    App.page = 1;
    const q = App.searchQuery.toLowerCase();
    App.filteredProjects = App.allProjects.filter(p => {
        if (q && ![p.project_name, p.municipality, p.architect, p.canton, p.project_description]
            .some(f => (f || '').toLowerCase().includes(q))) return false;
        if (App.filters.data_source?.size && !App.filters.data_source.has(p.data_source)) return false;
        if (App.filters.category?.size && !App.filters.category.has(p.category)) return false;
        if (App.filters.canton?.size && !App.filters.canton.has(p.canton)) return false;
        if (App.filters.arbeiten_type?.size && !App.filters.arbeiten_type.has(p.arbeiten_type)) return false;
        if (App.filters.yearFrom && (p.completion_year || 0) < parseInt(App.filters.yearFrom)) return false;
        if (App.filters.yearTo && (p.completion_year || 9999) > parseInt(App.filters.yearTo)) return false;
        return true;
    });

    App.filteredProjects.sort((a, b) => {
        let va = a[App.sortCol], vb = b[App.sortCol];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        const dir = App.sortDir === 'asc' ? 1 : -1;
        return (typeof va === 'string' ? va.localeCompare(vb) : va - vb) * dir;
    });

    updateUrl();
    renderFilterPills();
    document.getElementById('resultsCount').textContent = `${App.filteredProjects.length} Projekte`;
    render();
}

function renderFilterPills() {
    const el = document.getElementById('filterPills');
    const pills = [];
    const names = { data_source: 'Quelle', category: 'Kategorie', canton: 'Kanton',
        arbeiten_type: 'Art', yearFrom: 'Ab', yearTo: 'Bis' };
    const optLookup = {
        data_source: App.filterOptions.dataSources,
        category: App.filterOptions.categories,
        canton: App.filterOptions.cantons,
        arbeiten_type: ARBEITEN_TYPES,
    };
    for (const [key, val] of Object.entries(App.filters)) {
        if (!val) continue;
        if (val instanceof Set) {
            if (val.size === 0) continue;
            const opts = optLookup[key];
            const labels = [...val].map(v => opts?.find(o => o.value === v)?.label || v);
            pills.push(`<span class="filter-pill" data-key="${key}">${names[key] || key}: ${labels.join(', ')} <span class="material-icons-outlined">close</span></span>`);
        } else {
            pills.push(`<span class="filter-pill" data-key="${key}">${names[key] || key}: ${val} <span class="material-icons-outlined">close</span></span>`);
        }
    }
    if (pills.length > 0) {
        pills.push(`<span class="filter-pill filter-pill-reset" data-key="__reset"><span class="material-icons-outlined">replay</span> Alle zurücksetzen</span>`);
    }
    el.innerHTML = pills.join('');
    el.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            if (pill.dataset.key === '__reset') { resetFilters(); return; }
            delete App.filters[pill.dataset.key]; applyFilters();
        });
    });
    const badge = document.getElementById('filterBadge');
    const count = Object.values(App.filters).filter(Boolean).length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline' : 'none';
}

// === View Switching ===
function switchView(view) {
    App.currentView = view;
    document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
    document.getElementById(view + 'View')?.classList.add('active');
    updateUrl();
    render();
}

const VIEW_RENDERERS = { dashboard: renderDashboard, gallery: renderGallery, list: renderList, map: renderMap };
function render() { VIEW_RENDERERS[App.currentView]?.(); }

// === Filter Modal ===
function openFilterModal() {
    const body = document.getElementById('filterModalBody');
    const opts = App.filterOptions;
    body.innerHTML = `<div class="filter-grid">
        <div class="filter-group"><label>Datenquelle</label><select id="fmSrc">${optionsHTML(opts.dataSources, App.filters.data_source)}</select></div>
        <div class="filter-group"><label>Kategorie</label><select id="fmCat">${optionsHTML(opts.categories, App.filters.category)}</select></div>
        <div class="filter-group"><label>Kanton</label><select id="fmCanton">${optionsHTML(opts.cantons, App.filters.canton)}</select></div>
        <div class="filter-group"><label>Art der Arbeiten</label><select id="fmArt">${optionsHTML(
            ARBEITEN_TYPES, App.filters.arbeiten_type)}</select></div>
        <div class="filter-group"><label>Jahr von</label><input type="number" id="fmYearFrom" value="${App.filters.yearFrom || ''}" placeholder="${opts.yearRange?.min_year || ''}"></div>
        <div class="filter-group"><label>Jahr bis</label><input type="number" id="fmYearTo" value="${App.filters.yearTo || ''}" placeholder="${opts.yearRange?.max_year || ''}"></div>
    </div>`;
    document.getElementById('filterModal').classList.add('active');
}

function closeFilterModal() { document.getElementById('filterModal').classList.remove('active'); }

function applyFilterModal() {
    const setOrDelete = (key, val) => { if (val) App.filters[key] = new Set([val]); else delete App.filters[key]; };
    setOrDelete('data_source', document.getElementById('fmSrc').value);
    setOrDelete('category', document.getElementById('fmCat').value);
    setOrDelete('canton', document.getElementById('fmCanton').value);
    setOrDelete('arbeiten_type', document.getElementById('fmArt').value);
    App.filters.yearFrom = document.getElementById('fmYearFrom').value || undefined;
    App.filters.yearTo = document.getElementById('fmYearTo').value || undefined;
    Object.keys(App.filters).forEach(k => { if (!App.filters[k]) delete App.filters[k]; });
    closeFilterModal();
    populateMultiFilters();
    applyFilters();
}

function resetFilters() {
    App.filters = {};
    App.searchQuery = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('searchClear').style.display = 'none';
    document.querySelectorAll('.multi-filter').forEach(mf => {
        mf.classList.remove('has-value', 'open');
        mf.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        const btn = mf.querySelector('.multi-filter-btn');
        const label = btn.textContent.replace(/\s*\(\d+\)\s*/, '').replace(/\s*expand_more\s*/, '').trim();
        btn.innerHTML = `${label} <span class="material-icons-outlined">expand_more</span>`;
    });
    closeFilterModal();
    applyFilters();
}

function populateMultiFilters() {
    const opts = App.filterOptions;
    const arts = [
        ...ARBEITEN_TYPES
    ];
    fillMultiFilter('mfSource', 'data_source', opts.dataSources || []);
    fillMultiFilter('mfCategory', 'category', opts.categories || []);
    fillMultiFilter('mfCanton', 'canton', opts.cantons || []);
    fillMultiFilter('mfArt', 'arbeiten_type', arts);
}

const _multiFilterWired = new Set();

function fillMultiFilter(containerId, filterKey, items) {
    const container = document.getElementById(containerId);
    const dropdown = container.querySelector('.multi-filter-dropdown');
    const btn = container.querySelector('.multi-filter-btn');
    const baseLabel = btn.textContent.trim().replace(/\s*expand_more\s*/, '').split('\n')[0].trim();

    dropdown.innerHTML = items.map(item => {
        const checked = App.filters[filterKey]?.has(item.value) ? 'checked' : '';
        return `<label class="multi-filter-option"><input type="checkbox" value="${item.value}" ${checked}> ${esc(item.label)}</label>`;
    }).join('');

    // Wire listeners only once per container
    if (!_multiFilterWired.has(containerId)) {
        _multiFilterWired.add(containerId);
        btn.addEventListener('click', e => {
            e.stopPropagation();
            document.querySelectorAll('.multi-filter.open').forEach(mf => { if (mf !== container) mf.classList.remove('open'); });
            container.classList.toggle('open');
        });
        dropdown.addEventListener('change', () => {
            const checked = [...dropdown.querySelectorAll('input:checked')].map(cb => cb.value);
            if (checked.length > 0) App.filters[filterKey] = new Set(checked);
            else delete App.filters[filterKey];
            container.classList.toggle('has-value', checked.length > 0);
            btn.innerHTML = checked.length > 0
                ? `${baseLabel} (${checked.length}) <span class="material-icons-outlined">expand_more</span>`
                : `${baseLabel} <span class="material-icons-outlined">expand_more</span>`;
            applyFilters();
        });
    }

    // Update visual state
    const activeSet = App.filters[filterKey];
    if (activeSet?.size) {
        container.classList.add('has-value');
        btn.innerHTML = `${baseLabel} (${activeSet.size}) <span class="material-icons-outlined">expand_more</span>`;
    }
}

document.addEventListener('click', () => {
    document.querySelectorAll('.multi-filter.open').forEach(mf => mf.classList.remove('open'));
});

function optionsHTML(opts, selected) {
    const isSelected = selected instanceof Set ? v => selected.has(v) : v => v === selected;
    return `<option value="">Alle</option>` + (opts || []).map(o =>
        `<option value="${o.value}"${isSelected(o.value) ? ' selected' : ''}>${esc(o.label)}</option>`
    ).join('');
}

// === Init ===
async function init() {
    try {
        const SQL = await initSqlJs({
            locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`
        });
        const resp = await fetch('data/kennwerte.db');
        if (!resp.ok) throw new Error(`DB load failed: ${resp.status}`);
        const buf = await resp.arrayBuffer();
        App.db = new KennwerteDB(new SQL.Database(new Uint8Array(buf)));
    } catch (e) {
        document.getElementById('loadingView').innerHTML = `<div class="empty-state"><h3>Fehler</h3><p>${esc(e.message)}</p></div>`;
        return;
    }

    App.allProjects = App.db.getProjects();
    App.filterOptions = App.db.getFilterOptions();

    const isOverlay = restoreFromUrl();

    // Wire events
    let searchTimer;
    document.getElementById('searchInput').addEventListener('input', e => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            App.searchQuery = e.target.value;
            document.getElementById('searchClear').style.display = App.searchQuery ? 'block' : 'none';
            applyFilters();
        }, 300);
    });
    document.getElementById('searchClear').addEventListener('click', () => {
        App.searchQuery = '';
        document.getElementById('searchInput').value = '';
        document.getElementById('searchClear').style.display = 'none';
        applyFilters();
    });
    populateMultiFilters();

    document.getElementById('sortSelect').addEventListener('change', e => {
        const [col, dir] = e.target.value.split(':');
        App.sortCol = col;
        App.sortDir = dir;
        applyFilters();
    });

    document.querySelectorAll('.view-btn').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
    document.getElementById('filterBtn').addEventListener('click', openFilterModal);
    document.getElementById('filterModalClose').addEventListener('click', closeFilterModal);
    document.getElementById('filterApply').addEventListener('click', applyFilterModal);
    document.getElementById('filterReset').addEventListener('click', resetFilters);
    document.getElementById('btnEstimator').addEventListener('click', showEstimator);
    document.querySelectorAll('#listTable thead th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            if (App.sortCol === th.dataset.col) App.sortDir = App.sortDir === 'asc' ? 'desc' : 'asc';
            else { App.sortCol = th.dataset.col; App.sortDir = th.dataset.col === 'completion_year' ? 'desc' : 'asc'; }
            applyFilters();
        });
    });
    window.addEventListener('popstate', () => {
        const p = getUrlParams();
        if (p.detail) { showDetail(parseInt(p.detail)); }
        else if (p.estimator) { showEstimator(); }
        else {
            document.getElementById('detailView').classList.remove('active');
            document.getElementById('estimatorView').classList.remove('active');
            document.getElementById('searchSection').style.display = '';
            if (typeof detailMapInstance !== 'undefined' && detailMapInstance) { detailMapInstance.remove(); detailMapInstance = null; }
            restoreFromUrl();
            applyFilters();
        }
    });
    document.getElementById('filterModal').addEventListener('click', e => {
        if (e.target === document.getElementById('filterModal')) closeFilterModal();
    });

    // Initial render
    document.getElementById('loadingView').classList.remove('active');
    if (!isOverlay) {
        // Set view UI state without rendering (applyFilters will render)
        document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === App.currentView));
        document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
        document.getElementById(App.currentView + 'View')?.classList.add('active');
        applyFilters();
    }
}

init();
