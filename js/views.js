/* kennwerte-db — View renderers: Gallery, List, Map, Dashboard */

// === Event delegation (wired once, never re-attached) ===
let _delegationWired = { card: false, list: false, sidebar: false };

function wireCardDelegation() {
    if (_delegationWired.card) return;
    _delegationWired.card = true;
    const grid = document.getElementById('cardGrid');
    grid.addEventListener('click', e => {
        // Tag click → add filter instead of opening detail
        const tag = e.target.closest('.tag[data-filter-key]');
        if (tag) {
            e.stopPropagation();
            const key = tag.dataset.filterKey;
            const val = tag.dataset.filterValue;
            if (!App.filters[key]) App.filters[key] = new Set();
            App.filters[key].add(val);
            populateMultiFilters();
            applyFilters();
            return;
        }
        const card = e.target.closest('.card');
        if (card) showDetail(parseInt(card.dataset.id));
    });
    grid.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            const card = e.target.closest('.card');
            if (card) { e.preventDefault(); showDetail(parseInt(card.dataset.id)); }
        }
    });
}

function wireListDelegation() {
    if (_delegationWired.list) return;
    _delegationWired.list = true;
    const tbody = document.getElementById('listBody');
    tbody.addEventListener('click', e => {
        const row = e.target.closest('tr');
        if (row?.dataset.id) showDetail(parseInt(row.dataset.id));
    });
    tbody.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            const row = e.target.closest('tr');
            if (row?.dataset.id) { e.preventDefault(); showDetail(parseInt(row.dataset.id)); }
        }
    });
}

function wireSidebarDelegation() {
    if (_delegationWired.sidebar) return;
    _delegationWired.sidebar = true;
    const sidebar = document.getElementById('mapSidebar');
    sidebar.addEventListener('click', e => {
        const item = e.target.closest('.map-sidebar-item');
        if (!item) return;
        const id = parseInt(item.dataset.id);
        const p = App.projectMap.get(id);
        if (p && p._lng != null) selectMapProject(id, [p._lng, p._lat]);
    });
    sidebar.addEventListener('dblclick', e => {
        const item = e.target.closest('.map-sidebar-item');
        if (item) showDetail(parseInt(item.dataset.id));
    });
}

// === Gallery View ===
function renderGallery() {
    const grid = document.getElementById('cardGrid');
    const empty = document.getElementById('emptyGallery');
    if (App.filteredProjects.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        document.getElementById('galleryPagination').innerHTML = '';
        return;
    }
    empty.style.display = 'none';
    const q = App.searchQuery.toLowerCase();
    const searchRe = q ? new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi') : null;
    const hl = (text) => searchRe ? esc(text).replace(searchRe, '<mark class="search-hl">$1</mark>') : esc(text);
    const pageItems = getPage(App.filteredProjects);
    grid.innerHTML = pageItems.map(p => {
        const icon = CATEGORY_ICONS[p.category] || 'apartment';
        const hasData = p.gf_m2 || p.gv_m3 || p.construction_cost_total || p.chf_per_m2_gf;
        const hasImg = !!p._imgBase;
        return `
        <div class="card" data-id="${p.id}" tabindex="0" role="link" aria-label="${esc(p._displayName)} \u2013 ${esc(p._displayMuni)}">
            <div class="card-image">
                ${hasImg
                    ? `<img src="${p._imgBase}.jpeg" alt="" class="card-image-real" loading="lazy"
                        onerror="if(this.src.endsWith('.jpeg')){this.src='${p._imgBase}.png'}else{this.style.display='none';this.nextElementSibling.style.display='flex';}">
                       <div class="card-image-placeholder ${srcClass(p.data_source)}" style="display:none">
                        <span class="material-icons-outlined placeholder-icon">${icon}</span>
                        <span class="placeholder-src">${esc(p.data_source || '')}</span>
                       </div>`
                    : `<div class="card-image-placeholder ${srcClass(p.data_source)}">
                        <span class="material-icons-outlined placeholder-icon">${icon}</span>
                        <span class="placeholder-src">${esc(p.data_source || '')}</span>
                    </div>`}
                <div class="card-tags card-tags-top">${tagHTML(p.arbeiten_type)} ${srcTagHTML(p.data_source)} ${countryTagHTML(p.country)} ${qualityTagHTML(p._qualityGrade)}</div>
                <div class="card-tags card-tags-bottom">${categoryTagHTML(p)} ${p.completion_year ? `<span class="tag tag-sm tag-year">${p.completion_year}</span>` : ''}</div>
            </div>
            <div class="card-content">
                <div class="card-title">${hl(p._displayName)}</div>
                <div class="card-location">${hl(p._displayMuni)}${p.canton ? ' ' + esc(p.canton) : ''}</div>
                ${hasData ? `<div class="card-kpis">
                    <div><span class="card-kpi-label">${abbr('GF', 'Geschossfläche')}</span><div class="card-kpi-value">${fmtArea(p.gf_m2)}</div></div>
                    <div><span class="card-kpi-label">${abbr('GV', 'Gebäudevolumen')}</span><div class="card-kpi-value">${fmtVol(p.gv_m3)}</div></div>
                    <div><span class="card-kpi-label">Kosten</span><div class="card-kpi-value">${p.construction_cost_total ? fmtMio(p.construction_cost_total) : EMPTY}</div></div>
                    <div><span class="card-kpi-label">CHF/m\u00B2 ${abbr('GF', 'Geschossfläche')}</span><div class="card-kpi-value ${p.chf_per_m2_gf ? 'highlight' : 'muted'}">${p.chf_per_m2_gf ? fmtN(p.chf_per_m2_gf) : EMPTY}</div></div>
                </div>` : `<div class="card-no-data">Keine Kostendaten</div>`}
            </div>
        </div>`;
    }).join('');
    wireCardDelegation();
    renderPagination(App.filteredProjects.length, 'galleryPagination', renderGallery);
}

// === Dashboard View ===
function renderDashboard() {
    const all = App.filteredProjects;

    if (all.length === 0) {
        document.getElementById('dashboardContent').innerHTML = `<div class="empty-state">
            <span class="material-icons-outlined">dashboard</span>
            <h3>Keine Daten für Dashboard</h3>
            <p>Passen Sie die Filter an, um Projekte anzuzeigen.</p>
        </div>`;
        return;
    }

    // Single-pass aggregation
    const catMap = {}, srcMap = {}, yearMap = {};
    let withCostCount = 0, withGFCount = 0;
    const costValues = [];
    const sources = new Set();

    all.forEach(p => {
        if (p.chf_per_m2_gf != null) { withCostCount++; costValues.push(p.chf_per_m2_gf); }
        if (p.gf_m2 != null) withGFCount++;
        sources.add(p.data_source);

        const cat = p.category_label || p.category || 'Andere';
        if (!catMap[cat]) catMap[cat] = { total: 0, withBM: 0, values: [] };
        catMap[cat].total++;
        if (p.chf_per_m2_gf != null) { catMap[cat].withBM++; catMap[cat].values.push(p.chf_per_m2_gf); }

        const src = p.data_source || 'andere';
        if (!srcMap[src]) srcMap[src] = { total: 0, withBM: 0 };
        srcMap[src].total++;
        if (p.chf_per_m2_gf != null) srcMap[src].withBM++;

        if (p.completion_year) yearMap[p.completion_year] = (yearMap[p.completion_year] || 0) + 1;
    });

    const stats = computeStats(costValues);
    const catRows = Object.entries(catMap).sort((a, b) => b[1].total - a[1].total);
    const maxAvg = Math.max(...catRows.map(([, s]) => s.values.length ? s.values.reduce((a, b) => a + b, 0) / s.values.length : 0));
    const years = Object.entries(yearMap).sort((a, b) => a[0] - b[0]);
    const maxYear = Math.max(...years.map(([, n]) => n));

    document.getElementById('dashboardContent').innerHTML = `
        <h2 style="margin-bottom:var(--space-6)">Dashboard</h2>
        <div class="stats-boxes" style="margin-bottom:var(--space-6)">
            <div class="stat-box"><div class="stat-box-value">${all.length}</div><div class="stat-box-label">Projekte</div></div>
            <div class="stat-box"><div class="stat-box-value">${withGFCount}</div><div class="stat-box-label">mit ${abbr('GF', 'Geschossfläche')}</div></div>
            <div class="stat-box"><div class="stat-box-value">${withCostCount}</div><div class="stat-box-label">mit Kosten</div></div>
            <div class="stat-box"><div class="stat-box-value accent">${stats.median ? fmtN(stats.median) : EMPTY}</div><div class="stat-box-label">Median CHF/m\u00B2</div></div>
            <div class="stat-box"><div class="stat-box-value">${sources.size}</div><div class="stat-box-label">Quellen</div></div>
        </div>
        ${costValues.length > 0 ? `<div class="detail-card" style="margin-bottom:var(--space-4)">
            <div class="detail-card-header">CHF/m\u00B2 ${abbr('GF', 'Geschossfläche')} \u2014 Verteilung</div>
            <div class="detail-card-body">${renderBoxPlot(stats)}</div>
        </div>` : ''}
        <div class="detail-grid">
            <div class="detail-card">
                <div class="detail-card-header">Nach Kategorie</div>
                <div class="detail-card-body">
                    ${catRows.map(([cat, s]) => {
                        const avg = s.values.length ? Math.round(s.values.reduce((a, b) => a + b, 0) / s.values.length) : null;
                        const barW = avg ? Math.round((avg / maxAvg) * 100) : 0;
                        return `<div class="cost-row" style="grid-template-columns:1fr 40px 80px 100px">
                            <div class="cost-name">${esc(cat)}</div>
                            <div class="cost-amount">${s.total}</div>
                            <div class="cost-amount">${avg ? fmtN(avg) : EMPTY}</div>
                            <div class="cost-bar-wrap"><div class="cost-bar" style="width:${barW}%"></div></div>
                        </div>`;
                    }).join('')}
                    <div style="font-size:var(--font-size-xs);color:var(--neutral-400);margin-top:var(--space-2)">Spalten: Kategorie \u00B7 Anzahl \u00B7 \u00D8 CHF/m\u00B2 ${abbr('GF', 'Geschossfläche')}</div>
                </div>
            </div>
            <div class="detail-card">
                <div class="detail-card-header">Nach Quelle</div>
                <div class="detail-card-body">
                    ${Object.entries(srcMap).map(([src, s]) => `<div class="detail-field">
                        <span class="detail-field-label">${srcTagHTML(src)}</span>
                        <span class="detail-field-value">${s.total} Projekte (${s.withBM} mit Kennwerten)</span>
                    </div>`).join('')}
                </div>
            </div>
        </div>
        <div class="detail-card" style="margin-top:var(--space-4)">
            <div class="detail-card-header">Projekte nach Fertigstellungsjahr</div>
            <div class="detail-card-body" style="display:flex;align-items:flex-end;gap:2px;height:120px;padding-bottom:var(--space-6);position:relative" role="img" aria-label="Balkendiagramm: Projekte pro Jahr">
                ${years.map(([year, n]) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">
                    <div style="width:100%;max-width:24px;background:var(--secondary-500);opacity:0.6;border-radius:2px 2px 0 0;height:${Math.round((n/maxYear)*100)}%;" title="${year}: ${n} Projekte"></div>
                    <div style="font-size:10px;color:var(--neutral-400);margin-top:2px;transform:rotate(-45deg);white-space:nowrap">${year}</div>
                </div>`).join('')}
            </div>
        </div>
    `;
}

// === List View ===
function renderList() {
    const q = App.searchQuery.toLowerCase();
    const searchRe = q ? new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi') : null;
    const hl = (text) => searchRe ? esc(text).replace(searchRe, '<mark class="search-hl">$1</mark>') : esc(text);
    const pageItems = getPage(App.filteredProjects);

    if (App.filteredProjects.length === 0) {
        document.getElementById('listBody').innerHTML = `<tr><td colspan="9" style="text-align:center;padding:var(--space-16);color:var(--neutral-400)">
            <span class="material-icons-outlined" style="font-size:36px;display:block;margin-bottom:var(--space-2)">search_off</span>
            Keine Projekte gefunden
        </td></tr>`;
        document.getElementById('listPagination').innerHTML = '';
        return;
    }

    const tbody = document.getElementById('listBody');
    tbody.innerHTML = pageItems.map(p => `
        <tr data-id="${p.id}" tabindex="0" role="link">
            <td class="num">${p.completion_year || EMPTY}</td>
            <td>${hl(p._displayMuni)}${p.canton ? '<br><small style="color:var(--neutral-400)">' + esc(p.canton) + '</small>' : ''}</td>
            <td><strong>${hl(p._displayName)}</strong></td>
            <td>${esc(p.category_label || p.category)}<br><small>${srcTagHTML(p.data_source)} ${countryTagHTML(p.country)}</small></td>
            <td>${tagHTML(p.arbeiten_type)}</td>
            <td class="num">${p.gf_m2 ? fmtN(p.gf_m2) : EMPTY}</td>
            <td class="num">${p.construction_cost_total ? fmtMio(p.construction_cost_total) : EMPTY}</td>
            <td class="num" style="font-weight:600">${p.chf_per_m2_gf ? fmtN(p.chf_per_m2_gf) : EMPTY}</td>
            <td class="num">${p.chf_per_m3_gv ? fmtN(p.chf_per_m3_gv) : EMPTY}</td>
        </tr>
    `).join('');
    wireListDelegation();

    // Sort indicators + sync dropdown
    document.querySelectorAll('#listTable thead th.sortable').forEach(th => {
        th.classList.toggle('sorted', th.dataset.col === App.sortCol);
        th.setAttribute('aria-sort', th.dataset.col === App.sortCol ? (App.sortDir === 'asc' ? 'ascending' : 'descending') : 'none');
        const existing = th.querySelector('.sort-arrow');
        if (existing) existing.remove();
        if (th.dataset.col === App.sortCol) {
            th.insertAdjacentHTML('beforeend', `<span class="sort-arrow">${App.sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>`);
        }
    });
    syncSortSelect();
    renderPagination(App.filteredProjects.length, 'listPagination', renderList);
}

// Sync sort dropdown with current sort state
function syncSortSelect() {
    const sel = document.getElementById('sortSelect');
    const val = `${App.sortCol}:${App.sortDir}`;
    if (sel && sel.value !== val) {
        // Check if the option exists
        const opt = sel.querySelector(`option[value="${val}"]`);
        if (opt) sel.value = val;
    }
}

// === Map View (GeoJSON clustering) ===
const MAP_SOURCE_ID = 'projects';
const MAP_CLUSTER_LAYER = 'clusters';
const MAP_COUNT_LAYER = 'cluster-count';
const MAP_POINT_LAYER = 'unclustered-point';

const CANTON_COORDS = {
    BE: [7.45, 46.95], ZH: [8.55, 47.38], AG: [8.05, 47.39], BS: [7.59, 47.56],
    BL: [7.73, 47.44], LU: [8.30, 47.05], GR: [9.53, 46.73], VD: [6.63, 46.62],
    GE: [6.15, 46.20], TI: [8.96, 46.32], SG: [9.38, 47.42], TG: [9.05, 47.57],
    UR: [8.64, 46.88], SZ: [8.65, 47.02], NW: [8.39, 46.96], OW: [8.25, 46.88],
    GL: [9.07, 47.04], FR: [7.08, 46.80], VS: [7.60, 46.23],
    JU: [7.15, 47.35], SO: [7.53, 47.21], NE: [6.93, 47.00],
    AR: [9.38, 47.38], AI: [9.41, 47.33], SH: [8.64, 47.70], ZG: [8.52, 47.17],
};

let _mapLoaded = false;

function renderMap() {
    if (!App.map) {
        initMap();
        App.map.on('load', () => {
            _mapLoaded = true;
            addClusterLayers();
            updateMapData();
            renderMapSidebar();
        });
    } else if (_mapLoaded) {
        updateMapData();
        renderMapSidebar();
    }
}

function initMap() {
    App.map = new maplibregl.Map({
        container: 'map',
        style: MAP_STYLE,
        center: [8.2275, 46.8182],
        zoom: 7.5
    });
    App.map.addControl(new maplibregl.NavigationControl(), 'top-right');
    // Refresh sidebar when viewport changes (debounced by MapLibre internally)
    App.map.on('moveend', () => { if (_mapLoaded) renderMapSidebar(); });
}

function addClusterLayers() {
    App.map.addSource(MAP_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
    });

    App.map.addLayer({
        id: MAP_CLUSTER_LAYER,
        type: 'circle',
        source: MAP_SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': '#0096C7',
            'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 30, 32],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff'
        }
    });

    App.map.addLayer({
        id: MAP_COUNT_LAYER,
        type: 'symbol',
        source: MAP_SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
            'text-field': '{point_count_abbreviated}',
            'text-size': 12
        }
    });

    App.map.addLayer({
        id: MAP_POINT_LAYER,
        type: 'circle',
        source: MAP_SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': ['match', ['get', 'artClass'],
                'neubau', '#10B981',
                'sanierung', '#3B82F6',
                'umbau', '#D97706',
                '#71767F'],
            'circle-radius': ['case', ['get', 'approximate'], 5, 7],
            'circle-stroke-width': ['case', ['get', 'approximate'], 1, 2],
            'circle-stroke-color': '#fff',
            'circle-opacity': ['case', ['get', 'approximate'], 0.6, 1]
        }
    });

    App.map.on('click', MAP_CLUSTER_LAYER, e => {
        const features = App.map.queryRenderedFeatures(e.point, { layers: [MAP_CLUSTER_LAYER] });
        const clusterId = features[0].properties.cluster_id;
        App.map.getSource(MAP_SOURCE_ID).getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            App.map.easeTo({ center: features[0].geometry.coordinates, zoom });
        });
    });

    App.map.on('click', MAP_POINT_LAYER, e => {
        const f = e.features[0];
        const id = f.properties.id;
        const coords = f.geometry.coordinates.slice();
        // Highlight sidebar
        document.querySelectorAll('.map-sidebar-item').forEach(el => {
            const isActive = parseInt(el.dataset.id) === id;
            el.classList.toggle('active', isActive);
            if (isActive) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        // Show popup directly at click location
        showMapPopup(id, coords);
    });

    App.map.on('dblclick', MAP_POINT_LAYER, e => {
        e.preventDefault();
        showDetail(e.features[0].properties.id);
    });

    App.map.on('mouseenter', MAP_CLUSTER_LAYER, () => { App.map.getCanvas().style.cursor = 'pointer'; });
    App.map.on('mouseleave', MAP_CLUSTER_LAYER, () => { App.map.getCanvas().style.cursor = ''; });
    App.map.on('mouseenter', MAP_POINT_LAYER, () => { App.map.getCanvas().style.cursor = 'pointer'; });
    App.map.on('mouseleave', MAP_POINT_LAYER, () => { App.map.getCanvas().style.cursor = ''; });
}

function getArtClass(type) {
    if (type === 'NEUBAU') return 'neubau';
    if (type?.includes('SANIERUNG')) return 'sanierung';
    if (type?.includes('UMBAU')) return 'umbau';
    return 'other';
}

// Projects with map coordinates (filtered set, cached per filter pass)
let _mapProjects = [];

function updateMapData() {
    if (_activePopup) { _activePopup.remove(); _activePopup = null; }

    // Cache the geo-enabled subset and build GeoJSON from pre-computed coords
    _mapProjects = App.filteredProjects.filter(p => p._lng != null);

    const features = _mapProjects.map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p._lng, p._lat] },
        properties: {
            id: p.id,
            name: p.project_name,
            artClass: getArtClass(p.arbeiten_type),
            approximate: p._approx,
            chf: p.chf_per_m2_gf ? fmtN(p.chf_per_m2_gf) : ''
        }
    }));

    const source = App.map.getSource(MAP_SOURCE_ID);
    if (source) source.setData({ type: 'FeatureCollection', features });
}

const MAP_SIDEBAR_LIMIT = 50;

function renderMapSidebar() {
    const sidebar = document.getElementById('mapSidebar');

    if (_mapProjects.length === 0) {
        sidebar.innerHTML = `<div class="map-sidebar-empty">
            <span class="material-icons-outlined">location_off</span>
            Keine Projekte mit Standort gefunden
        </div>`;
        return;
    }

    // Filter to projects visible in current map viewport
    const bounds = App.map.getBounds();
    const visible = _mapProjects.filter(p =>
        p._lng >= bounds.getWest() && p._lng <= bounds.getEast() &&
        p._lat >= bounds.getSouth() && p._lat <= bounds.getNorth()
    );

    if (visible.length === 0) {
        sidebar.innerHTML = `<div class="map-sidebar-empty">
            <span class="material-icons-outlined">zoom_out_map</span>
            Keine Projekte im aktuellen Kartenausschnitt
        </div>`;
        return;
    }

    const capped = visible.slice(0, MAP_SIDEBAR_LIMIT);
    const overflow = visible.length - capped.length;

    sidebar.innerHTML = capped.map(p =>
        `<div class="map-sidebar-item" data-id="${p.id}">
            <div class="map-sidebar-title">${esc(p._displayName)}</div>
            <div class="map-sidebar-sub">${esc(p.category_label || p.category)} \u00B7 ${esc(p._displayMuni)} ${esc(p.canton || '')} \u00B7 ${p.completion_year || ''}${p._approx ? ' <span title="Ungefährer Standort (Kanton)">\u2248</span>' : ''}</div>
            <div class="map-sidebar-sub">${tagHTML(p.arbeiten_type)} ${p.gf_m2 ? `<span style="margin-left:var(--space-1)">${fmtArea(p.gf_m2)}</span>` : ''}</div>
            ${p.chf_per_m2_gf ? `<div class="map-sidebar-kpi">CHF/m\u00B2 ${fmtN(p.chf_per_m2_gf)}</div>` : ''}
        </div>`
    ).join('')
    + (overflow > 0 ? `<div class="map-sidebar-empty">+ ${overflow} weitere \u2014 reinzoomen für mehr</div>` : '');

    wireSidebarDelegation();
}

// === Map Info Popup ===
let _activePopup = null;

function buildMapPopupHTML(p) {
    const icon = CATEGORY_ICONS[p.category] || 'apartment';
    const hasImg = !!p._imgBase;
    const IMG_ONERROR = "if(this.src.endsWith('.jpeg')){this.src=this.src.replace('.jpeg','.png')}else{this.style.display='none';this.nextElementSibling.style.display='flex';}";

    return `<div class="map-popup-header">
        <div class="map-popup-img">
            ${hasImg
                ? `<img src="${p._imgBase}.jpeg" alt="" onerror="${IMG_ONERROR}">
                   <span class="material-icons-outlined" style="display:none">${icon}</span>`
                : `<span class="material-icons-outlined">${icon}</span>`}
        </div>
        <div class="map-popup-info">
            <div class="map-popup-title">${esc(p._displayName)}</div>
            <div class="map-popup-sub">${esc(p._displayMuni)}${p.canton ? ' ' + esc(p.canton) : ''} \u00B7 ${p.completion_year ? esc(String(p.completion_year)) : ''}</div>
            <div class="map-popup-tags">${tagHTML(p.arbeiten_type)} ${srcTagHTML(p.data_source)}</div>
        </div>
    </div>
    <div class="map-popup-kpis">
        <div class="map-popup-kpi">
            <div class="map-popup-kpi-label">CHF/m\u00B2</div>
            <div class="map-popup-kpi-value${p.chf_per_m2_gf ? ' accent' : ''}">${p.chf_per_m2_gf ? fmtN(p.chf_per_m2_gf) : '\u2013'}</div>
        </div>
        <div class="map-popup-kpi">
            <div class="map-popup-kpi-label">${abbr('GF', 'Geschossfläche')}</div>
            <div class="map-popup-kpi-value">${p.gf_m2 ? fmtN(p.gf_m2) + ' m\u00B2' : '\u2013'}</div>
        </div>
        <div class="map-popup-kpi">
            <div class="map-popup-kpi-label">Kosten</div>
            <div class="map-popup-kpi-value">${p.construction_cost_total ? fmtMio(p.construction_cost_total).replace('CHF ', '') : '\u2013'}</div>
        </div>
    </div>
    <div class="map-popup-cta">
        <button class="btn btn-sm btn-accent" data-popup-detail="${p.id}">
            Details anzeigen <span class="material-icons-outlined" style="font-size:14px">arrow_forward</span>
        </button>
    </div>`;
}

function showMapPopup(id, lngLat) {
    const p = App.projectMap.get(id);
    if (!p || !App.map) return;

    // Remove existing popup
    if (_activePopup) { _activePopup.remove(); _activePopup = null; }

    const popup = new maplibregl.Popup({ closeButton: true, maxWidth: '340px', offset: 12 })
        .setLngLat(lngLat)
        .setHTML(buildMapPopupHTML(p))
        .addTo(App.map);

    _activePopup = popup;

    // Wire the CTA button inside the popup
    const popupEl = popup.getElement();
    popupEl.querySelector('[data-popup-detail]')?.addEventListener('click', () => {
        showDetail(id);
    });

    popup.on('close', () => { _activePopup = null; });
}

function selectMapProject(id, lngLat) {
    if (lngLat && App.map) {
        App.map.flyTo({ center: lngLat, zoom: Math.max(App.map.getZoom(), 12), duration: 800 });
        // Show popup after fly animation completes
        App.map.once('moveend', () => showMapPopup(id, lngLat));
    }

    // Highlight sidebar item
    document.querySelectorAll('.map-sidebar-item').forEach(el => {
        const isActive = parseInt(el.dataset.id) === id;
        el.classList.toggle('active', isActive);
        if (isActive) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });
}
