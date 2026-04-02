/* kennwerte-db — View renderers: Gallery, List, Map, Dashboard */

// === Gallery View ===
function renderGallery() {
    const grid = document.getElementById('cardGrid');
    const empty = document.getElementById('emptyGallery');
    if (App.filteredProjects.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    const toRender = App.filteredProjects.slice(0, App.renderLimit);
    grid.innerHTML = toRender.map(p => {
        const icon = CATEGORY_ICONS[p.category] || 'apartment';
        const name = displayName(p);
        const muni = displayMuni(p);
        const hasData = p.gf_m2 || p.gv_m3 || p.construction_cost_total || p.chf_per_m2_gf;
        const hasImg = p.images_found > 0;
        const imgBase = `assets/images/projects/${p.id}/001`;
        return `
        <div class="card" data-id="${p.id}" tabindex="0" role="link">
            <div class="card-image">
                ${hasImg
                    ? `<img src="${imgBase}.jpeg" alt="" class="card-image-real" loading="lazy"
                        onerror="if(this.src.endsWith('.jpeg')){this.src='${imgBase}.png'}else{this.style.display='none';this.nextElementSibling.style.display='flex';}">
                       <div class="card-image-placeholder ${srcClass(p.data_source)}" style="display:none">
                        <span class="material-icons-outlined placeholder-icon">${icon}</span>
                        <span class="placeholder-src">${esc(p.data_source || '')}</span>
                       </div>`
                    : `<div class="card-image-placeholder ${srcClass(p.data_source)}">
                        <span class="material-icons-outlined placeholder-icon">${icon}</span>
                        <span class="placeholder-src">${esc(p.data_source || '')}</span>
                        ${p.completion_year ? '<span class="placeholder-year">' + p.completion_year + '</span>' : ''}
                    </div>`}
                <div class="card-tags">${srcTagHTML(p.data_source)} ${tagHTML(p.arbeiten_type)}</div>
            </div>
            <div class="card-content">
                <div class="card-title">${esc(name)}</div>
                <div class="card-location">${esc(muni)}${p.canton ? ' ' + p.canton : ''} \u00B7 ${p.completion_year || '\u2014'}</div>
                ${hasData ? `<div class="card-kpis">
                    <div><span class="card-kpi-label">GF</span><div class="card-kpi-value">${fmtArea(p.gf_m2)}</div></div>
                    <div><span class="card-kpi-label">GV</span><div class="card-kpi-value">${fmtVol(p.gv_m3)}</div></div>
                    <div><span class="card-kpi-label">Kosten</span><div class="card-kpi-value">${p.construction_cost_total ? fmtMio(p.construction_cost_total) : '\u2014'}</div></div>
                    <div><span class="card-kpi-label">CHF/m\u00B2 GF</span><div class="card-kpi-value ${p.chf_per_m2_gf ? 'highlight' : 'muted'}">${p.chf_per_m2_gf ? fmtN(p.chf_per_m2_gf) : '\u2014'}</div></div>
                </div>` : `<div class="card-no-data">Keine Kostendaten</div>`}
            </div>
        </div>`;
    }).join('');
    // Show "load more" if truncated
    document.getElementById('loadMore')?.remove();
    if (App.filteredProjects.length > App.renderLimit) {
        grid.insertAdjacentHTML('afterend',
            `<div class="load-more" id="loadMore"><button class="btn btn-outline" onclick="App.renderLimit+=60;renderGallery()">Weitere ${Math.min(60, App.filteredProjects.length - App.renderLimit)} von ${App.filteredProjects.length} laden</button></div>`);
    }
    grid.querySelectorAll('.card').forEach(c => {
        const handler = () => showDetail(parseInt(c.dataset.id));
        c.addEventListener('click', handler);
        c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } });
    });
}

// === Dashboard View ===
function renderDashboard() {
    const all = App.filteredProjects;
    const withCost = all.filter(p => p.chf_per_m2_gf != null);
    const withGF = all.filter(p => p.gf_m2 != null);
    const values = withCost.map(p => p.chf_per_m2_gf);
    const stats = computeStats(values);
    const sources = new Set(all.map(p => p.data_source));

    const catMap = {};
    all.forEach(p => {
        const cat = p.category_label || p.category || 'Andere';
        if (!catMap[cat]) catMap[cat] = { total: 0, withBM: 0, values: [] };
        catMap[cat].total++;
        if (p.chf_per_m2_gf != null) { catMap[cat].withBM++; catMap[cat].values.push(p.chf_per_m2_gf); }
    });
    const catRows = Object.entries(catMap).sort((a, b) => b[1].total - a[1].total);
    const maxAvg = Math.max(...catRows.map(([, s]) => s.values.length ? s.values.reduce((a, b) => a + b, 0) / s.values.length : 0));

    const srcMap = {};
    all.forEach(p => {
        const src = p.data_source || 'andere';
        if (!srcMap[src]) srcMap[src] = { total: 0, withBM: 0 };
        srcMap[src].total++;
        if (p.chf_per_m2_gf != null) srcMap[src].withBM++;
    });

    const yearMap = {};
    all.forEach(p => { if (p.completion_year) yearMap[p.completion_year] = (yearMap[p.completion_year] || 0) + 1; });
    const years = Object.entries(yearMap).sort((a, b) => a[0] - b[0]);
    const maxYear = Math.max(...years.map(([, n]) => n));

    document.getElementById('dashboardContent').innerHTML = `
        <h2 style="margin-bottom:var(--space-6)">Dashboard</h2>
        <div class="stats-boxes" style="margin-bottom:var(--space-6)">
            <div class="stat-box"><div class="stat-box-value">${all.length}</div><div class="stat-box-label">Projekte</div></div>
            <div class="stat-box"><div class="stat-box-value">${withGF.length}</div><div class="stat-box-label">mit GF</div></div>
            <div class="stat-box"><div class="stat-box-value">${withCost.length}</div><div class="stat-box-label">mit Kosten</div></div>
            <div class="stat-box"><div class="stat-box-value accent">${stats.median ? fmtN(stats.median) : '\u2014'}</div><div class="stat-box-label">Median CHF/m\u00B2</div></div>
            <div class="stat-box"><div class="stat-box-value">${sources.size}</div><div class="stat-box-label">Quellen</div></div>
        </div>
        ${withCost.length > 0 ? `<div class="detail-card" style="margin-bottom:var(--space-4)">
            <div class="detail-card-header">CHF/m\u00B2 GF \u2014 Verteilung</div>
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
                            <div class="cost-amount">${avg ? fmtN(avg) : '\u2014'}</div>
                            <div class="cost-bar-wrap"><div class="cost-bar" style="width:${barW}%"></div></div>
                        </div>`;
                    }).join('')}
                    <div style="font-size:var(--font-size-2xs);color:var(--neutral-400);margin-top:var(--space-2)">Spalten: Kategorie \u00B7 Anzahl \u00B7 \u00D8 CHF/m\u00B2 GF</div>
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
            <div class="detail-card-body" style="display:flex;align-items:flex-end;gap:2px;height:120px;padding-bottom:var(--space-6);position:relative">
                ${years.map(([year, n]) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">
                    <div style="width:100%;max-width:24px;background:var(--secondary-500);opacity:0.6;border-radius:2px 2px 0 0;height:${Math.round((n/maxYear)*100)}%;" title="${year}: ${n}"></div>
                    <div style="font-size:9px;color:var(--neutral-400);margin-top:2px;transform:rotate(-45deg);white-space:nowrap">${year}</div>
                </div>`).join('')}
            </div>
        </div>
    `;
}

// === List View ===
function renderList() {
    const tbody = document.getElementById('listBody');
    tbody.innerHTML = App.filteredProjects.map(p => `
        <tr data-id="${p.id}">
            <td class="num">${p.completion_year || '\u2014'}</td>
            <td>${esc(displayMuni(p))}${p.canton ? '<br><small style="color:var(--neutral-400)">' + p.canton + '</small>' : ''}</td>
            <td><strong>${esc(displayName(p))}</strong></td>
            <td>${esc(p.category_label || p.category)}<br><small>${srcTagHTML(p.data_source)}</small></td>
            <td>${tagHTML(p.arbeiten_type)}</td>
            <td class="num">${p.gf_m2 ? fmtN(p.gf_m2) : '\u2014'}</td>
            <td class="num">${p.construction_cost_total ? fmtMio(p.construction_cost_total) : '\u2014'}</td>
            <td class="num" style="font-weight:600;${p.chf_per_m2_gf ? 'color:var(--accent-600)' : ''}">${p.chf_per_m2_gf ? fmtN(p.chf_per_m2_gf) : '\u2014'}</td>
        </tr>
    `).join('');
    tbody.querySelectorAll('tr').forEach(r => r.addEventListener('click', () => showDetail(parseInt(r.dataset.id))));

    document.querySelectorAll('#listTable thead th.sortable').forEach(th => {
        th.classList.toggle('sorted', th.dataset.col === App.sortCol);
        const existing = th.querySelector('.sort-arrow');
        if (existing) existing.remove();
        if (th.dataset.col === App.sortCol) {
            th.insertAdjacentHTML('beforeend', `<span class="sort-arrow">${App.sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>`);
        }
    });
}

// === Map View ===
function renderMap() {
    if (!App.map) {
        initMap();
        // Wait for map to load before adding markers
        App.map.on('load', () => {
            updateMapMarkers();
            renderMapSidebar();
        });
    } else {
        updateMapMarkers();
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
}

const CANTON_COORDS = {
    BE: [7.45, 46.95], ZH: [8.55, 47.38], AG: [8.05, 47.39], BS: [7.59, 47.56],
    BL: [7.73, 47.44], LU: [8.30, 47.05], GR: [9.53, 46.73], VD: [6.63, 46.62],
    GE: [6.15, 46.20], TI: [8.96, 46.32], SG: [9.38, 47.42], TG: [9.05, 47.57],
    UR: [8.64, 46.88], SZ: [8.65, 47.02], NW: [8.39, 46.96], OW: [8.25, 46.88],
    GL: [9.07, 47.04], FR: [7.08, 46.80], VS: [7.60, 46.23],
    JU: [7.15, 47.35], SO: [7.53, 47.21], NE: [6.93, 47.00],
    AR: [9.38, 47.38], AI: [9.41, 47.33], SH: [8.64, 47.70], ZG: [8.52, 47.17],
};

function updateMapMarkers() {
    App.mapMarkers.forEach(m => m.remove());
    App.mapMarkers = [];

    App.filteredProjects.forEach(p => {
        let lng, lat;
        if (p.coord_lat && p.coord_lng) {
            lat = p.coord_lat;
            lng = p.coord_lng;
        } else if (p.canton && CANTON_COORDS[p.canton]) {
            [lng, lat] = CANTON_COORDS[p.canton];
            lng += (Math.random() - 0.5) * 0.08;
            lat += (Math.random() - 0.5) * 0.05;
        } else {
            return;
        }

        const el = document.createElement('div');
        el.className = 'map-marker';
        if (p.arbeiten_type === 'NEUBAU') el.classList.add('neubau');
        else if (p.arbeiten_type?.includes('SANIERUNG')) el.classList.add('sanierung');
        else if (p.arbeiten_type?.includes('UMBAU')) el.classList.add('umbau');
        else el.classList.add('other');

        el.addEventListener('click', () => selectMapProject(p.id, [lng, lat]));
        el.addEventListener('dblclick', () => showDetail(p.id));
        el.title = `${p.project_name}\n${p.chf_per_m2_gf ? fmtN(p.chf_per_m2_gf) + ' CHF/m\u00B2' : ''}`;

        const marker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(App.map);
        marker._projectId = p.id;
        marker._lngLat = [lng, lat];
        App.mapMarkers.push(marker);
    });
}

function renderMapSidebar() {
    const sidebar = document.getElementById('mapSidebar');
    sidebar.innerHTML = App.filteredProjects.filter(p => p.canton).map(p => `
        <div class="map-sidebar-item" data-id="${p.id}">
            <div class="map-sidebar-title">${esc(displayName(p))}</div>
            <div class="map-sidebar-sub">${esc(displayMuni(p))} ${p.canton || ''} \u00B7 ${p.completion_year || ''}</div>
            ${p.chf_per_m2_gf ? `<div class="map-sidebar-kpi">CHF/m\u00B2 ${fmtN(p.chf_per_m2_gf)}</div>` : ''}
        </div>
    `).join('');
    sidebar.querySelectorAll('.map-sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = parseInt(item.dataset.id);
            const marker = App.mapMarkers.find(m => m._projectId === id);
            if (marker) selectMapProject(id, marker._lngLat);
        });
        item.addEventListener('dblclick', () => showDetail(parseInt(item.dataset.id)));
    });
}

function selectMapProject(id, lngLat) {
    App.mapMarkers.forEach(m => m.getElement().classList.remove('active'));
    const marker = App.mapMarkers.find(m => m._projectId === id);
    if (marker) marker.getElement().classList.add('active');

    if (lngLat && App.map) {
        App.map.flyTo({ center: lngLat, zoom: Math.max(App.map.getZoom(), 10), duration: 800 });
    }

    document.querySelectorAll('.map-sidebar-item').forEach(el => {
        const isActive = parseInt(el.dataset.id) === id;
        el.classList.toggle('active', isActive);
        el.querySelector('.map-detail-btn')?.remove();
        if (isActive) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            const btn = document.createElement('button');
            btn.className = 'btn btn-sm btn-accent map-detail-btn';
            btn.innerHTML = 'Details anzeigen <span class="material-icons-outlined" style="font-size:14px">arrow_forward</span>';
            btn.style.marginTop = '6px';
            btn.addEventListener('click', e => { e.stopPropagation(); showDetail(id); });
            el.appendChild(btn);
        }
    });
}
