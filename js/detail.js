/* kennwerte-db — Detail view, image carousel, SIA 416, peer comparison, estimator */

// === Image Carousel ===
let carouselImages = [];
let carouselIndex = 0;

function openCarousel(images, startIndex = 0) {
    carouselImages = images;
    carouselIndex = startIndex;
    // Build thumbnails once
    const thumbs = document.getElementById('carouselThumbnails');
    thumbs.innerHTML = images.map((im, idx) =>
        `<div class="carousel-thumb" style="background-image:url('${im}')" data-idx="${idx}"></div>`
    ).join('');
    thumbs.querySelectorAll('.carousel-thumb').forEach(t => {
        t.addEventListener('click', () => goToCarouselImage(parseInt(t.dataset.idx)));
    });
    updateCarouselView();
    document.getElementById('carouselOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCarousel() {
    document.getElementById('carouselOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

function navigateCarousel(direction) {
    const newIndex = carouselIndex + direction;
    if (newIndex >= 0 && newIndex < carouselImages.length) {
        carouselIndex = newIndex;
        updateCarouselView();
    }
}

function goToCarouselImage(idx) {
    carouselIndex = idx;
    updateCarouselView();
}

function updateCarouselView() {
    document.getElementById('carouselCounter').textContent = `${carouselIndex + 1} / ${carouselImages.length}`;
    const img = document.getElementById('carouselImage');
    img.onerror = () => { img.alt = 'Bild nicht verfügbar'; img.style.opacity = '0.3'; };
    img.style.opacity = '';
    img.src = carouselImages[carouselIndex];
    document.querySelector('.carousel-nav-btn.prev').disabled = carouselIndex === 0;
    document.querySelector('.carousel-nav-btn.next').disabled = carouselIndex === carouselImages.length - 1;
    document.querySelectorAll('#carouselThumbnails .carousel-thumb').forEach((t, i) => {
        t.classList.toggle('active', i === carouselIndex);
    });
}

// Keyboard nav for carousel
document.addEventListener('keydown', e => {
    if (!document.getElementById('carouselOverlay').classList.contains('active')) return;
    if (e.key === 'Escape') closeCarousel();
    else if (e.key === 'ArrowLeft') navigateCarousel(-1);
    else if (e.key === 'ArrowRight') navigateCarousel(1);
});

// === Image Gallery Builder ===
// Store images in a global to avoid data-attribute JSON encoding issues
let _galleryImages = [];

function buildImageGallery(images) {
    if (!images || images.length === 0) return '';
    _galleryImages = images;
    const maxThumbs = 4;
    const mainImg = images[0];
    const thumbs = images.slice(1, maxThumbs + 1);

    return `<div class="detail-gallery" id="detailGallery">
        <div class="detail-main-image clickable" style="background-image:url('${mainImg}')" data-image-index="0"></div>
        ${thumbs.map((img, i) => {
            const isLast = i === thumbs.length - 1 && images.length > maxThumbs + 1;
            return `<div class="detail-thumb clickable" style="background-image:url('${img}')" data-image-index="${i + 1}">
                ${isLast ? `<div class="detail-thumb-overlay"><span>Alle ${images.length} Bilder</span></div>` : ''}
            </div>`;
        }).join('')}
    </div>`;
}

// === SIA 416 Area Breakdown ===
function renderSIA416(p) {
    const gf = p.gf_m2, gv = p.gv_m3, ngf = p.ngf_m2;
    if (!gf) return '';

    const kf = gf && ngf ? gf - ngf : null;
    const ratioGvGf = gv && gf ? (gv / gf).toFixed(2) : null;
    const decNgfGf = ngf && gf ? (ngf / gf).toFixed(2) : null;
    const pctNgf = ngf && gf ? Math.round((ngf / gf) * 100) : null;
    const pctKf = kf && gf ? Math.round((kf / gf) * 100) : null;

    const row = (abbr, name, val, unit, pct) => {
        const valStr = val != null ? fmtN(val) : '\u2014';
        const pctStr = pct != null ? `${pct}%` : '';
        return `<div class="sia-row"><span class="sia-abbr">${abbr}</span><span class="sia-name">${name}</span><span class="sia-val">${valStr} ${unit}</span><span class="sia-pct">${pctStr}</span></div>`;
    };

    return `<div class="detail-card" style="margin-bottom:var(--space-4)">
        <div class="detail-card-header">Volumen und Flächen nach SIA 416</div>
        <div class="detail-card-body">
            <div class="sia-layout">
                <div class="sia-table">
                    <div class="sia-section-title">Gebäudevolumen</div>
                    ${row('GV', 'Gebäudevolumen', gv, 'm\u00B3', '100')}
                    <div class="sia-section-title" style="margin-top:var(--space-3)">Gebäudeflächen</div>
                    ${row('GF', 'Geschossfläche', gf, 'm\u00B2', '100')}
                    ${row('KF', 'Konstruktionsfläche', kf, 'm\u00B2', pctKf)}
                    ${row('NGF', 'Nettogeschossfläche', ngf, 'm\u00B2', pctNgf)}
                </div>
                <div class="sia-chart">
                    <div class="sia-chart-title">Formquotienten</div>
                    <div class="sia-ratio-row">
                        <span class="sia-ratio-label">GV/GF</span>
                        <span class="sia-ratio-value">${ratioGvGf || '\u2014'} m</span>
                    </div>
                    <div class="sia-ratio-row">
                        <span class="sia-ratio-label">NGF/GF</span>
                        <span class="sia-ratio-value">${decNgfGf || '\u2014'}</span>
                    </div>
                    ${gf && ngf ? `
                    <div class="sia-chart-title" style="margin-top:var(--space-4)">Flächenzerlegung</div>
                    <div class="sia-bar-group">
                        <div class="sia-bar-label">GF 100%</div>
                        <div class="sia-bar-track"><div class="sia-bar sia-bar-gf" style="width:100%"></div></div>
                    </div>
                    <div class="sia-bar-group">
                        <div class="sia-bar-label">NGF ${pctNgf}%</div>
                        <div class="sia-bar-track">
                            <div class="sia-bar sia-bar-ngf" style="width:${pctNgf}%"></div>
                            <div class="sia-bar sia-bar-kf" style="width:${pctKf}%;margin-left:auto"></div>
                        </div>
                        <div class="sia-bar-label-right">KF ${pctKf}%</div>
                    </div>` : ''}
                </div>
            </div>
        </div>
    </div>`;
}

// === Detail Map ===
let detailMapInstance = null;
window.addEventListener('beforeunload', () => { if (detailMapInstance) detailMapInstance.remove(); });

function initDetailMap(lat, lng) {
    if (detailMapInstance) { detailMapInstance.remove(); detailMapInstance = null; }
    const container = document.getElementById('detailMap');
    if (!container) return;
    const lngNum = parseFloat(lng), latNum = parseFloat(lat);
    if (isNaN(lngNum) || isNaN(latNum)) return;
    detailMapInstance = new maplibregl.Map({
        container: 'detailMap',
        style: MAP_STYLE,
        center: [lngNum, latNum],
        zoom: 14,
        dragPan: false, scrollZoom: false, boxZoom: false,
        dragRotate: false, doubleClickZoom: false, touchZoomRotate: false,
        keyboard: false, attributionControl: false
    });
    detailMapInstance.on('load', () => {
        const markerEl = document.createElement('div');
        markerEl.className = 'map-marker neubau active';
        new maplibregl.Marker({ element: markerEl }).setLngLat([lngNum, latNum]).addTo(detailMapInstance);
    });
}

// === Peer Comparison ===
function renderPeerComparison(project) {
    let peers = App.allProjects.filter(p =>
        p.id !== project.id && p.chf_per_m2_gf != null &&
        p.arbeiten_type === project.arbeiten_type && p.category === project.category
    );
    if (peers.length < 3) {
        peers = App.allProjects.filter(p => p.id !== project.id && p.chf_per_m2_gf != null && p.arbeiten_type === project.arbeiten_type);
    }
    if (peers.length < 2) return '';

    const stats = computeStats(peers.map(p => p.chf_per_m2_gf));
    const warn = peers.length < 5 ? `<div class="warning-banner"><span class="material-icons-outlined">warning</span> Vergleichsmenge enthält nur ${peers.length} Projekte. Werte nicht belastbar (n &lt; 5).</div>` : '';

    return `<div class="detail-card" style="margin-bottom:var(--space-4)">
        <div class="detail-card-header">Vergleich mit ähnlichen Projekten</div>
        <div class="detail-card-body">
            <div style="font-size:var(--font-size-sm);color:var(--neutral-500);margin-bottom:var(--space-3)">
                ${tagHTML(project.arbeiten_type)} ${esc(project.category_label || project.category)} \u00B7 n = ${peers.length} Projekte
            </div>
            ${warn}
            <div style="font-size:var(--font-size-xs);color:var(--neutral-500);margin-bottom:var(--space-1)">CHF/m\u00B2 GF</div>
            ${renderBoxPlot(stats, project.chf_per_m2_gf)}
            <div style="margin-top:var(--space-3);font-size:var(--font-size-sm)">
                Dieses Projekt: <strong style="color:var(--accent-600)">${fmtN(project.chf_per_m2_gf)} CHF/m\u00B2 GF</strong>
            </div>
        </div>
    </div>`;
}

// === Data Quality Card ===
function renderDataQuality(p, costs, benchmarks, indexRef, timeline, images) {
    // Checklist items: [label, hasData]
    const checks = [
        ['Kostendaten', p.construction_cost_total != null],
        ['BKP-Gliederung', costs.length > 0],
        ['Flächenangaben', p.gf_m2 != null],
        ['Kennwerte (PDF)', benchmarks.length > 0],
        ['Baupreisindex', indexRef != null],
        ['Termine', timeline.length > 0],
        ['Projektbeschrieb', !!p.project_description],
        ['Bilder', images.length > 0],
        ['Koordinaten', p.coord_lat != null && p.coord_lng != null],
        ['Beteiligte', !!(p.architect || p.general_planner || p.general_contractor)],
    ];
    const filled = checks.filter(([, ok]) => ok).length;
    const total = checks.length;
    const pct = Math.round((filled / total) * 100);

    // Overall grade: A (>=80%), B (>=60%), C (>=40%), D (<40%)
    // Bonus: Schlussabrechnung data phase boosts trust
    const phase = p.phase_at_recording || '';
    const phaseLabel = phase || 'Keine Angabe';
    let grade, gradeClass;
    if (pct >= 80) { grade = 'A'; gradeClass = 'quality-a'; }
    else if (pct >= 60) { grade = 'B'; gradeClass = 'quality-b'; }
    else if (pct >= 40) { grade = 'C'; gradeClass = 'quality-c'; }
    else { grade = 'D'; gradeClass = 'quality-d'; }

    return `<div class="detail-card"><div class="detail-card-header">Datenqualität</div><div class="detail-card-body">
        <div class="dq-header">
            <div class="dq-grade ${gradeClass}">${grade}</div>
            <div class="dq-summary">
                <div class="dq-bar-track"><div class="dq-bar-fill" style="width:${pct}%"></div></div>
                <div class="dq-bar-label">${filled} / ${total} Datenbereiche verfügbar</div>
            </div>
        </div>
        <div class="dq-meta">
            ${detailField('Datenphase', phaseLabel)}
            ${detailField('Extraktionsgrad', p.quality_grade || null)}
            ${detailField('Preisstand', p.completion_year || null)}
        </div>
        <div class="dq-checklist">
            ${checks.map(([label, ok]) =>
                `<div class="dq-check ${ok ? 'ok' : 'missing'}">
                    <span class="material-icons-outlined">${ok ? 'check_circle' : 'radio_button_unchecked'}</span>
                    <span>${label}</span>
                </div>`
            ).join('')}
        </div>
    </div></div>`;
}

// === Show Detail View ===
async function showDetail(id) {
    const p = App.db.getProject(id);
    if (!p) return;

    // Capture return URL: current URL without detail param
    const returnUrl = new URLSearchParams(window.location.search);
    returnUrl.delete('detail');
    App.detailReturnParams = returnUrl.toString() ? '?' + returnUrl.toString() : window.location.pathname;

    const url = new URLSearchParams(window.location.search);
    url.set('detail', id);
    window.history.pushState({}, '', '?' + url.toString());

    const costs = App.db.getCostRecords(id);
    const benchmarks = App.db.getBenchmarks(id);
    const indexRef = App.db.getIndexReference(id);
    const timeline = App.db.getTimeline(id);
    const allImages = await App.db.getProjectImages(id, p.images_found).catch(() => []);

    const maxCost = costs.length > 0 ? Math.max(...costs.map(c => c.amount_chf || 0)) : 1;
    const name = displayName(p);
    const catLabel = p.category_label || p.category || '';

    let html = '';

    // --- Breadcrumb bar ---
    html += `<div class="detail-breadcrumb-bar">
        <div class="detail-breadcrumb">
            <a href="?" class="breadcrumb-link">kennwerte-db</a>
            <span class="material-icons-outlined breadcrumb-sep">chevron_right</span>
            <span class="breadcrumb-item">${esc(catLabel)}</span>
            <span class="material-icons-outlined breadcrumb-sep">chevron_right</span>
            <span class="breadcrumb-item breadcrumb-current">${esc(name)}</span>
        </div>
        <div class="detail-breadcrumb-actions">
            ${p.pdf_filename ? `<a class="btn btn-outline btn-sm" href="data/pdfs/${encodeURIComponent(p.pdf_filename)}" target="_blank">
                <span class="material-icons-outlined">picture_as_pdf</span> PDF öffnen
            </a>` : ''}
            <button class="btn btn-outline btn-sm" onclick="hideDetail()">
                <span class="material-icons-outlined">arrow_back</span> Zurück zur Liste
            </button>
        </div>
    </div>`;

    // --- Hero section ---
    const hasImages = allImages.length > 0;
    html += `<div class="detail-hero${hasImages ? '' : ' no-gallery'}">`;
    if (hasImages) html += buildImageGallery(allImages);
    html += `<div class="detail-hero-info">
            <h2>${esc(name)}</h2>
            <div class="detail-subtitle">${esc(displayMuni(p))}${p.canton ? ' ' + p.canton : ''} \u00B7 ${p.completion_year || '\u2014'}</div>
            <div class="detail-hero-tags">${tagHTML(p.arbeiten_type)} ${srcTagHTML(p.data_source)}</div>
            <div class="detail-hero-kpis">
                <div class="hero-kpi"><div class="hero-kpi-label">CHF/m\u00B2 GF</div><div class="hero-kpi-value${p.chf_per_m2_gf ? ' accent' : ''}">${p.chf_per_m2_gf ? fmtN(p.chf_per_m2_gf) : '\u2014'}</div></div>
                <div class="hero-kpi"><div class="hero-kpi-label">Geschossfläche</div><div class="hero-kpi-value">${p.gf_m2 ? fmtArea(p.gf_m2) : '\u2014'}</div></div>
                <div class="hero-kpi"><div class="hero-kpi-label">Gesamtkosten</div><div class="hero-kpi-value">${p.construction_cost_total ? fmtMio(p.construction_cost_total) : '\u2014'}</div></div>
            </div>
        </div>
    </div>`;

    // --- Row 1: Projektbeschrieb + Standort ---
    const desc = p.project_description ? esc(p.project_description) : '';
    const descLong = desc.split(/\s+/).length > 80;
    const addrParts = [p.street, p.postal_code, displayMuni(p)].filter(Boolean);
    const addrLine = addrParts.length > 0 ? addrParts.join(' ') : null;

    html += `<div class="detail-grid">
        <div class="detail-card"><div class="detail-card-header">Projektbeschrieb</div>
        <div class="detail-card-body">
            ${desc
                ? `<div class="description-text${descLong ? ' truncated' : ''}">${desc}</div>
                   ${descLong ? '<button class="btn btn-sm btn-outline desc-toggle" onclick="this.previousElementSibling.classList.toggle(\'truncated\');this.textContent=this.previousElementSibling.classList.contains(\'truncated\')?\'Mehr anzeigen\':\'Weniger anzeigen\'">Mehr anzeigen</button>' : ''}`
                : '<span class="detail-field-value empty">Keine Angabe</span>'}
        </div></div>
        <div class="detail-card"><div class="detail-card-header">Standort</div><div class="detail-card-body standort-card">
            <div class="standort-coords">
                ${detailField('WGS84', p.coord_lat && p.coord_lng ? `${Number(p.coord_lat).toFixed(6)}, ${Number(p.coord_lng).toFixed(6)}` : null)}
                ${detailField('Google Maps', p.coord_lat && p.coord_lng
                    ? `<a href="https://www.google.com/maps/search/?api=1&query=${p.coord_lat},${p.coord_lng}" target="_blank" class="standort-link">Auf externer Karte anzeigen <span class="material-icons-outlined">open_in_new</span></a>` : null)}
                ${detailField('Google Street View', p.coord_lat && p.coord_lng
                    ? `<a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${p.coord_lat},${p.coord_lng}" target="_blank" class="standort-link">Auf externer Karte anzeigen <span class="material-icons-outlined">open_in_new</span></a>` : null)}
                ${detailField('map.geo.admin.ch', p.coord_lat && p.coord_lng
                    ? `<a href="https://map.geo.admin.ch/#/map?lang=de&center=${p.coord_lng},${p.coord_lat}&z=12&crosshair=marker&topic=ech&layers=ch.swisstopo.amtliches-strassenverzeichnis;ch.bfs.gebaeude_wohnungs_register&bgLayer=ch.swisstopo.swissimage" target="_blank" class="standort-link">Auf externer Karte anzeigen <span class="material-icons-outlined">open_in_new</span></a>` : null)}
            </div>
            ${addrLine ? `<div class="standort-address"><span class="material-icons-outlined">location_on</span> ${esc(addrLine)}</div>` : ''}
            <div class="standort-map" id="detailMapContainer">
                ${p.coord_lat && p.coord_lng
                    ? '<div id="detailMap"></div>'
                    : '<div class="standort-map-empty"><span class="material-icons-outlined">location_off</span><span>Keine Koordinaten vorhanden</span></div>'}
            </div>
            <table class="standort-table">
                <thead><tr><th>Land</th><th>Kanton</th><th>Gemeinde</th><th>PLZ</th><th>Strasse</th><th>Hausnr.</th></tr></thead>
                <tbody><tr>
                    <td>${esc(p.country || '\u2014')}</td><td>${esc(p.canton || '\u2014')}</td>
                    <td>${esc(displayMuni(p) || '\u2014')}</td><td>${esc(p.postal_code || '\u2014')}</td>
                    <td>${esc(p.street || '\u2014')}</td><td>${esc(p.house_number || '\u2014')}</td>
                </tr></tbody>
            </table>
        </div></div>
    </div>`;

    // --- Row 2: Projektdaten + Datenqualität ---
    html += `<div class="detail-grid">
        <div class="detail-card"><div class="detail-card-header">Projektdaten</div><div class="detail-card-body">
            ${detailField('Art der Arbeiten', p.arbeiten_type ? tagHTML(p.arbeiten_type) : null)}
            ${detailField('Bauherr (Org.)', p.client_org)}
            ${detailField('Bauherrschaft', p.client_name)}
            ${detailField('Nutzer', p.user_org)}
            ${detailField('Architektur', p.architect)}
            ${detailField('Generalplaner', p.general_planner)}
            ${detailField('Generalunternehmer', p.general_contractor)}
            ${detailField('Energiestandard', p.energy_standard)}
            ${detailField('Bauweise', p.construction_method)}
            ${detailField('Beschaffungsmodell', p.procurement_model)}
            ${detailField('Datenquelle', p.data_source ? srcTagHTML(p.data_source) : null)}
        </div></div>
        ${renderDataQuality(p, costs, benchmarks, indexRef, timeline, allImages)}
    </div>`;

    // --- Mengen und Kennwerte (full width) ---
    html += `<div class="detail-card" style="margin-bottom:var(--space-4)">
        <div class="detail-card-header">Mengen und Kennwerte</div>
        <div class="detail-card-body">
            <div class="mengen-grid">
                <div>${detailField('Gebäudevolumen (GV)', p.gv_m3 ? fmtVol(p.gv_m3) : null)}
                ${detailField('Geschossfläche (GF)', p.gf_m2 ? fmtArea(p.gf_m2) : null)}
                ${detailField('Nettogeschossfläche (NGF)', p.ngf_m2 ? fmtArea(p.ngf_m2) : null)}
                ${detailField('Geschosse', p.floors)}
                ${detailField('Arbeitsplätze', p.workplaces ? fmtN(p.workplaces) : null)}</div>
                <div>${detailField('Gesamtkosten', p.construction_cost_total ? fmtMio(p.construction_cost_total) : null)}
                ${detailField('CHF/m\u00B2 GF', p.chf_per_m2_gf ? fmtN(p.chf_per_m2_gf) : null, true)}
                ${detailField('CHF/m\u00B3 GV', p.gv_m3 && p.construction_cost_total ? fmtN(Math.round(p.construction_cost_total / p.gv_m3)) : null)}
                ${detailField('NGF/GF', p.ngf_m2 && p.gf_m2 ? (p.ngf_m2 / p.gf_m2).toFixed(2) : null)}
                ${detailField('GV/GF', p.gv_m3 && p.gf_m2 ? (p.gv_m3 / p.gf_m2).toFixed(2) + ' m' : null)}</div>
            </div>
        </div>
    </div>`;

    // --- SIA 416 ---
    html += renderSIA416(p);

    // --- Peer comparison ---
    html += p.chf_per_m2_gf
        ? renderPeerComparison(p)
        : `<div class="detail-card" style="margin-bottom:var(--space-4)">
            <div class="detail-card-header">Vergleich mit ähnlichen Projekten</div>
            <div class="detail-card-body"><span class="detail-field-value empty">Keine Vergleichsdaten (CHF/m\u00B2 GF fehlt)</span></div>
        </div>`;

    // --- BKP ---
    html += `<div class="detail-card" style="margin-bottom:var(--space-4)">
        <div class="detail-card-header">BKP-Kostenstruktur</div>
        <div class="detail-card-body">
            ${costs.length > 0 ? costs.map(c => {
                const isMain = c.bkp_code.length === 1;
                const barW = Math.round((c.amount_chf / maxCost) * 100);
                return `<div class="cost-row ${isMain ? 'main-group' : 'sub-group'}">
                    <div class="cost-code">${c.bkp_code}</div>
                    <div class="cost-name">${esc(c.bkp_name || '')}</div>
                    <div class="cost-amount">${fmtN(c.amount_chf)}</div>
                    <div class="cost-bar-wrap"><div class="cost-bar" style="width:${barW}%"></div></div>
                </div>`;
            }).join('') : '<span class="detail-field-value empty">Keine Angabe</span>'}
        </div>
    </div>`;

    // --- Benchmarks ---
    html += `<div class="detail-card" style="margin-bottom:var(--space-4)">
        <div class="detail-card-header">Kennwerte (aus PDF)</div>
        <div class="detail-card-body" style="display:flex;gap:var(--space-8);flex-wrap:wrap">
            ${benchmarks.length > 0 ? benchmarks.map(b => `<div>
                <div style="font-size:var(--font-size-2xs);color:var(--neutral-500);text-transform:uppercase">${esc(b.benchmark_type.replace(/_/g, ' '))}</div>
                <div style="font-size:var(--font-size-2xl);font-weight:700;color:var(--accent-600);font-family:var(--font-mono)">${fmtN(b.value)}</div>
            </div>`).join('') : '<span class="detail-field-value empty">Keine Angabe</span>'}
        </div>
    </div>`;

    // --- Baupreisindex ---
    html += `<div class="detail-card" style="margin-bottom:var(--space-4)">
        <div class="detail-card-header">Baupreisindex</div>
        <div class="detail-card-body">
            ${detailField('Index', indexRef?.index_name)}
            ${detailField('Datum', indexRef?.index_date)}
            ${detailField('Wert', indexRef?.index_value)}
            ${detailField('Basis', indexRef?.basis_date ? `${indexRef.basis_date} = ${indexRef.basis_value}` : null)}
        </div>
    </div>`;

    // --- Termine ---
    const milestoneLabels = { planungsbeginn: 'Planungsbeginn', wettbewerb: 'Wettbewerb', baubeginn: 'Baubeginn', bauende: 'Bauende', bauzeit_monate: 'Bauzeit (Monate)' };
    const timelineMap = {};
    timeline.forEach(t => { timelineMap[t.milestone] = t.value; });
    html += `<div class="detail-card" style="margin-bottom:var(--space-4)">
        <div class="detail-card-header">Termine</div>
        <div class="detail-card-body">
            ${Object.entries(milestoneLabels).map(([key, label]) => detailField(label, timelineMap[key])).join('')}
        </div>
    </div>`;


    // Render
    const el = document.getElementById('detailContent');
    el.innerHTML = html;
    document.getElementById('detailView').classList.add('active');
    document.getElementById('searchSection').style.display = 'none';
    document.getElementById('detailView').querySelector('.detail-scroll').scrollTop = 0;

    if (p.coord_lat && p.coord_lng) initDetailMap(p.coord_lat, p.coord_lng);

    // Wire gallery clicks
    el.querySelectorAll('.detail-main-image.clickable, .detail-thumb.clickable').forEach(img => {
        img.addEventListener('click', () => {
            if (_galleryImages.length > 0) {
                openCarousel(_galleryImages, parseInt(img.dataset.imageIndex, 10));
            }
        });
    });

    // Scroll to top without stealing visible focus
    el.closest('.detail-scroll')?.scrollTo(0, 0);
}

function hideDetail() {
    document.getElementById('detailView').classList.remove('active');
    document.getElementById('searchSection').style.display = '';
    if (detailMapInstance) { detailMapInstance.remove(); detailMapInstance = null; }
    window.history.pushState({}, '', App.detailReturnParams || window.location.pathname);
}

// === Cost Estimator ===
function showEstimator() {
    const url = new URLSearchParams(window.location.search);
    url.set('estimator', '1');
    window.history.pushState({}, '', '?' + url.toString());
    const estReturn = new URLSearchParams(window.location.search);
    estReturn.delete('estimator');
    App.detailReturnParams = estReturn.toString() ? '?' + estReturn.toString() : window.location.pathname;

    const cats = App.filterOptions.categories || [];
    const arts = ARBEITEN_TYPES;
    const cantons = App.filterOptions.cantons || [];

    document.getElementById('estimatorContent').innerHTML = `
        <div class="detail-back" onclick="hideEstimator()">
            <span class="material-icons-outlined">arrow_back</span> Zurück
        </div>
        <div class="detail-header"><h2>Kostenschätzung</h2>
            <div class="detail-subtitle">Kennwertbasierte Schätzung auf Basis vergleichbarer Bauprojekte</div>
        </div>
        <div class="est-step">
            <div class="est-step-title">Schritt 1: Projekteigenschaften</div>
            <div class="est-form-row"><label class="est-form-label">Art der Arbeiten *</label>
                <select class="est-form-select" id="estArt"><option value="">Bitte wählen...</option>${arts.map(a => `<option value="${a.value}">${a.label}</option>`).join('')}</select></div>
            <div class="est-form-row"><label class="est-form-label">Kategorie *</label>
                <select class="est-form-select" id="estCat"><option value="">Bitte wählen...</option>${cats.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}</select></div>
            <div class="est-form-row"><label class="est-form-label">Kanton</label>
                <select class="est-form-select" id="estCanton"><option value="">Alle</option>${cantons.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}</select>
                <span class="est-form-hint">(optional)</span></div>
            <div class="est-form-row"><label class="est-form-label">Geschossfläche GF *</label>
                <input type="number" class="est-form-input" id="estGF" placeholder="z.B. 5000" style="max-width:200px"><span class="est-form-hint">m\u00B2</span></div>
            <div style="text-align:right;margin-top:var(--space-4)">
                <button class="btn btn-accent" id="estCompute"><span class="material-icons-outlined">search</span> Vergleichsmenge ermitteln</button>
            </div>
        </div>
        <div id="estResults"></div>
        <div class="disclaimer">Hinweis: Diese Werte sind Benchmarkauswertungen aus öffentlichen Bautendokumentationen, keine Kostenschätzung. Nicht teuerungsbereinigt.</div>
    `;
    document.getElementById('estCompute').addEventListener('click', computeEstimate);
    document.getElementById('estimatorView').classList.add('active');
    document.getElementById('searchSection').style.display = 'none';
    window.scrollTo(0, 0);
}

function hideEstimator() {
    document.getElementById('estimatorView').classList.remove('active');
    document.getElementById('searchSection').style.display = '';
    window.history.pushState({}, '', App.detailReturnParams || window.location.pathname);
}

function computeEstimate() {
    const art = document.getElementById('estArt').value;
    const cat = document.getElementById('estCat').value;
    const canton = document.getElementById('estCanton').value;
    const gf = parseFloat(document.getElementById('estGF').value);

    if (!art || !cat || !gf || gf <= 0) {
        document.getElementById('estResults').innerHTML = '<div class="warning-banner"><span class="material-icons-outlined">warning</span> Bitte Art, Kategorie und GF angeben.</div>';
        return;
    }

    let peers = App.allProjects.filter(p => p.chf_per_m2_gf != null && p.arbeiten_type === art && p.category === cat);
    if (canton) peers = peers.filter(p => p.canton === canton);
    if (peers.length < 3 && canton) peers = App.allProjects.filter(p => p.chf_per_m2_gf != null && p.arbeiten_type === art && p.category === cat);
    if (peers.length < 3) peers = App.allProjects.filter(p => p.chf_per_m2_gf != null && p.arbeiten_type === art);

    if (peers.length < 2) {
        document.getElementById('estResults').innerHTML = '<div class="warning-banner"><span class="material-icons-outlined">warning</span> Zu wenige vergleichbare Projekte gefunden.</div>';
        return;
    }

    const stats = computeStats(peers.map(p => p.chf_per_m2_gf));
    const warn = peers.length < 5 ? `<div class="warning-banner"><span class="material-icons-outlined">warning</span> Nur ${peers.length} vergleichbare Projekte. Werte nicht belastbar (n &lt; 5).</div>` : '';

    document.getElementById('estResults').innerHTML = `
        <div class="est-step">
            <div class="est-step-title">Schritt 2: Vergleichsmenge (n = ${peers.length})</div>
            ${warn}
            <div class="table-wrap" style="max-height:300px;overflow-y:auto">
                <table class="data-table" style="font-size:var(--font-size-xs)">
                    <thead><tr><th>Jahr</th><th>Projekt</th><th>Ort</th><th class="num">GF m\u00B2</th><th class="num">CHF/m\u00B2</th><th>Quelle</th></tr></thead>
                    <tbody>${peers.map(p => `<tr onclick="showDetail(${p.id})" style="cursor:pointer">
                        <td>${p.completion_year || '\u2014'}</td><td>${esc(p.project_name)}</td>
                        <td>${esc(p.municipality || '')} ${p.canton || ''}</td>
                        <td class="num">${p.gf_m2 ? fmtN(p.gf_m2) : '\u2014'}</td>
                        <td class="num" style="font-weight:600">${fmtN(p.chf_per_m2_gf)}</td>
                        <td>${srcTagHTML(p.data_source)}</td>
                    </tr>`).join('')}</tbody>
                </table>
            </div>
        </div>
        <div class="est-step">
            <div class="est-step-title">Schritt 3: Kostenbandbreite (GF = ${fmtN(gf)} m\u00B2)</div>
            <div style="font-size:var(--font-size-xs);color:var(--neutral-500);margin-bottom:var(--space-2)">CHF/m\u00B2 GF Verteilung</div>
            ${renderBoxPlot(stats)}
            <div style="margin-top:var(--space-6)">
                <div style="font-size:var(--font-size-sm);font-weight:600;margin-bottom:var(--space-3)">Geschätzte Gebäudekosten (BKP 2)</div>
                <div class="est-result-row"><span class="est-result-label">P25 (konservativ)</span><span class="est-result-value">${fmtMio(stats.p25 * gf)}</span></div>
                <div class="est-result-row"><span class="est-result-label">Median</span><span class="est-result-value primary">${fmtMio(stats.median * gf)}</span></div>
                <div class="est-result-row"><span class="est-result-label">P75 (obere Bandbreite)</span><span class="est-result-value">${fmtMio(stats.p75 * gf)}</span></div>
            </div>
        </div>
    `;
}
