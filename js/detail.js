/* kennwerte-db — Detail view, image carousel, SIA 416, peer comparison, estimator */

// === Image Carousel ===
let carouselImages = [];
let carouselIndex = 0;

let _carouselWired = false;

function openCarousel(images, startIndex = 0) {
    carouselImages = images;
    carouselIndex = startIndex;
    const thumbs = document.getElementById('carouselThumbnails');
    thumbs.innerHTML = images.map((im, idx) =>
        `<div class="carousel-thumb" data-idx="${idx}"><img src="${im}" alt="" loading="lazy" onerror="${IMG_ONERROR}"></div>`
    ).join('');
    // Delegate click once
    if (!_carouselWired) {
        _carouselWired = true;
        thumbs.addEventListener('click', e => {
            const t = e.target.closest('.carousel-thumb');
            if (t) goToCarouselImage(parseInt(t.dataset.idx));
        });
    }
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
    img.onerror = function() {
        if (this.src.endsWith('.jpeg')) { this.src = this.src.replace('.jpeg', '.png'); }
        else { this.alt = 'Bild nicht verfügbar'; this.style.opacity = '0.3'; }
    };
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

// Wire carousel button listeners (replacing inline onclick)
document.getElementById('carouselCloseBtn').addEventListener('click', closeCarousel);
document.getElementById('carouselPrev').addEventListener('click', () => navigateCarousel(-1));
document.getElementById('carouselNext').addEventListener('click', () => navigateCarousel(1));
document.getElementById('carouselMain').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeCarousel();
});

// === Image Gallery Builder ===
// Store images in a global to avoid data-attribute JSON encoding issues
let _galleryImages = [];

const IMG_ONERROR = "if(this.src.endsWith('.jpeg')){this.src=this.src.replace('.jpeg','.png')}else{this.style.opacity='0.15'}";

function buildImageGallery(images) {
    if (!images || images.length === 0) return '';
    _galleryImages = images;
    const maxThumbs = 4;
    const mainImg = images[0];
    const thumbs = images.slice(1, maxThumbs + 1);

    return `<div class="detail-gallery" id="detailGallery">
        <div class="detail-main-image clickable" data-image-index="0">
            <img src="${mainImg}" alt="" loading="eager" onerror="${IMG_ONERROR}">
        </div>
        ${thumbs.map((img, i) => {
            const isLast = i === thumbs.length - 1 && images.length > maxThumbs + 1;
            return `<div class="detail-thumb clickable" data-image-index="${i + 1}">
                <img src="${img}" alt="" loading="lazy" onerror="${IMG_ONERROR}">
                ${isLast ? `<div class="detail-thumb-overlay"><span>Alle ${images.length} Bilder</span></div>` : ''}
            </div>`;
        }).join('')}
    </div>`;
}

// === SIA 416 Area Breakdown ===
function renderSIA416(p) {
    const gf = p.gf_m2, gv = p.gv_m3, ngf = p.ngf_m2;
    const gsf = p.gsf_m2, ggf = p.ggf_m2, uf = p.uf_m2, buf = p.buf_m2;
    const kf = gf && ngf ? gf - ngf : null;
    const vf = p.vf_m2, ff = p.ff_m2, nf = p.nf_m2, hnf = p.hnf_m2, nnf = p.nnf_m2, agf = p.agf_m2;
    const faw = p.faw_m2, fb = p.fb_m2;

    const pctOf = (val, base) => val != null && base ? Math.round((val / base) * 100) : null;
    const ratioOf = (a, b) => a != null && b ? (a / b).toFixed(2) : null;

    const row = (abbr, name, val, unit, pct) => {
        const valStr = val != null ? fmtN(val) : EMPTY;
        const pctStr = pct != null ? `${pct}%` : EMPTY;
        return `<div class="sia-row"><span class="sia-abbr">${abbr}</span><span class="sia-name">${name}</span><span class="sia-val">${valStr} ${unit}</span><span class="sia-pct">${pctStr}</span></div>`;
    };

    // Percentages for bar chart
    const pctNgf = pctOf(ngf, gf), pctKf = pctOf(kf, gf);
    const pctNf = pctOf(nf, gf), pctFf = pctOf(ff, gf), pctVf = pctOf(vf, gf);
    const pctHnf = pctOf(hnf, gf), pctNnf = pctOf(nnf, gf);

    const barRow = (label, pct, cls) => pct != null
        ? `<div class="sia-bar ${cls}" style="width:${pct}%"><span>${label} ${pct}%</span></div>`
        : '';

    return `<div class="detail-card">
        <div class="detail-card-header">Volumen und Flächen nach SIA 416</div>
        <div class="detail-card-body">
            <div class="sia-layout sia-truncated">
                <div class="sia-table">
                    <div class="sia-section-title">Gebäudevolumen</div>
                    ${row('GV', 'Gebäudevolumen', gv, 'm\u00B3', gv ? '100' : null)}

                    <div class="sia-section-title" style="margin-top:var(--space-3)">Gebäudeflächen</div>
                    ${row('GF', 'Geschossfläche', gf, 'm\u00B2', gf ? '100' : null)}
                    ${row('KF', 'Konstruktionsfläche', kf, 'm\u00B2', pctKf)}
                    ${row('NGF', 'Nettogeschossfläche', ngf, 'm\u00B2', pctNgf)}
                    ${row('VF', 'Verkehrsfläche', vf, 'm\u00B2', pctVf)}
                    ${row('FF', 'Funktionsfläche', ff, 'm\u00B2', pctFf)}
                    ${row('NF', 'Nutzfläche', nf, 'm\u00B2', pctNf)}
                    ${row('HNF', 'Hauptnutzfläche', hnf, 'm\u00B2', pctOf(hnf, gf))}
                    ${row('NNF', 'Nebennutzfläche', nnf, 'm\u00B2', pctOf(nnf, gf))}
                    ${row('AGF', 'Aussengeschossfläche', agf, 'm\u00B2', pctOf(agf, gf))}

                    <div class="sia-section-title" style="margin-top:var(--space-3)">Grundstücksflächen</div>
                    ${row('GSF', 'Grundstücksfläche', gsf, 'm\u00B2', gsf ? '100' : null)}
                    ${row('GGF', 'Gebäudegrundfläche', ggf, 'm\u00B2', pctOf(ggf, gsf))}
                    ${row('UF', 'Umgebungsfläche', uf, 'm\u00B2', pctOf(uf, gsf))}
                    ${row('BUF', 'Bearbeitete Umgebungsfläche', buf, 'm\u00B2', pctOf(buf, gsf))}
                </div>

            </div>
            <button class="btn btn-sm btn-outline sia-toggle desc-toggle">Mehr anzeigen</button>
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

    const homeCenter = [lngNum, latNum];
    const homeZoom = 17;

    detailMapInstance = new maplibregl.Map({
        container: 'detailMap',
        style: MAP_STYLE,
        center: homeCenter,
        zoom: homeZoom,
        attributionControl: false
    });

    // Navigation: zoom + compass
    detailMapInstance.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    // Home button: reset to marker
    const homeBtn = document.createElement('div');
    homeBtn.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    homeBtn.innerHTML = '<button type="button" class="maplibregl-ctrl-icon" title="Zurück zum Standort"><span class="material-icons-outlined" style="font-size:18px;line-height:29px">home</span></button>';
    homeBtn.addEventListener('click', () => {
        detailMapInstance.flyTo({ center: homeCenter, zoom: homeZoom, duration: 600 });
    });
    detailMapInstance.getContainer().querySelector('.maplibregl-ctrl-top-right').appendChild(homeBtn);

    detailMapInstance.on('load', () => {
        const markerEl = document.createElement('div');
        markerEl.className = 'map-marker neubau active';
        new maplibregl.Marker({ element: markerEl }).setLngLat(homeCenter).addTo(detailMapInstance);
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

    const statsGF = computeStats(peers.map(p => p.chf_per_m2_gf));
    const gvPeers = peers.filter(p => p.chf_per_m3_gv != null);
    const statsGV = gvPeers.length >= 2 ? computeStats(gvPeers.map(p => p.chf_per_m3_gv)) : null;
    const warn = peers.length < 5 ? `<div class="warning-banner"><span class="material-icons-outlined">warning</span> Vergleichsmenge enthält nur ${peers.length} Projekte. Werte nicht belastbar (n &lt; 5).</div>` : '';

    return `<div class="detail-card" style="margin-bottom:var(--space-4)">
        <div class="detail-card-header">Vergleich mit ähnlichen Projekten</div>
        <div class="detail-card-body">
            <div style="font-size:var(--font-size-sm);color:var(--neutral-500);margin-bottom:var(--space-3)">
                ${tagHTML(project.arbeiten_type)} ${esc(project.category_label || project.category)} \u00B7 n\u2009=\u2009${peers.length} Projekte
            </div>
            ${warn}

            <div class="box-plot-section">
                <div class="box-plot-title">CHF/m\u00B2 ${abbr('GF', 'Geschossfläche')}</div>
                ${renderBoxPlot(statsGF, project.chf_per_m2_gf)}
            </div>

            ${statsGV ? `<div class="box-plot-section" style="margin-top:var(--space-5)">
                <div class="box-plot-title">CHF/m\u00B3 ${abbr('GV', 'Gebäudevolumen')}</div>
                ${renderBoxPlot(statsGV, project.chf_per_m3_gv)}
            </div>` : ''}

            <div class="box-plot-legend">
                <span class="box-plot-legend-item"><span class="box-plot-legend-whisker"></span> Min / Max</span>
                <span class="box-plot-legend-item"><span class="box-plot-legend-box"></span> 25.\u201375. Perzentil</span>
                <span class="box-plot-legend-item"><span class="box-plot-legend-median"></span> Median</span>
                <span class="box-plot-legend-item"><span class="box-plot-legend-marker"></span> Dieses Projekt</span>
            </div>
        </div>
    </div>`;
}

// === eBKP-H Cost Table ===
// Each entry: name, reference unit label, unit type (m2/m3/chf), field on bauprojekt for Bezugsmenge
const EBKPH_META = {
    A: { name: 'Grundstück',                      ref: 'GSF', unit: 'm\u00B2', field: 'gsf_m2' },
    B: { name: 'Vorbereitung',                     ref: 'GSF', unit: 'm\u00B2', field: 'gsf_m2' },
    C: { name: 'Konstruktion Gebäude',             ref: 'GF',  unit: 'm\u00B2', field: 'gf_m2' },
    D: { name: 'Technik Gebäude',                  ref: 'GF',  unit: 'm\u00B2', field: 'gf_m2' },
    E: { name: 'Äussere Wandbekleidung Gebäude',   ref: 'FAW', unit: 'm\u00B2', field: 'faw_m2' },
    F: { name: 'Bedachung Gebäude',                ref: 'FB',  unit: 'm\u00B2', field: 'fb_m2' },
    G: { name: 'Ausbau Gebäude',                   ref: 'GF',  unit: 'm\u00B2', field: 'gf_m2' },
    H: { name: 'Nutzungsspez. Anlage Gebäude',     ref: 'NFH', unit: 'm\u00B2', field: 'nfh_m2' },
    I: { name: 'Umgebung Gebäude',                 ref: 'BUF', unit: 'm\u00B2', field: 'buf_m2' },
    J: { name: 'Ausstattung Gebäude',              ref: 'NF',  unit: 'm\u00B2', field: 'nf_m2' },
    V: { name: 'Planungskosten',                   ref: 'BBJ', unit: 'CHF',     field: null },
    W: { name: 'Nebenkosten zu Erstellung',        ref: 'GF',  unit: 'm\u00B2', field: 'gf_m2' },
    Y: { name: 'Reserve, Teuerung',                ref: 'BBW', unit: 'CHF',     field: null },
    Z: { name: 'Mehrwertsteuer',                   ref: 'BBY', unit: 'CHF',     field: null },
};

const EBKPH_BW_CODES = 'BCDEFGHIJVW'.split('');
const EBKPH_CG_CODES = 'CDEFG'.split('');
const EBKPH_ALL_CODES = Object.keys(EBKPH_META);

function renderEbkph(p, records) {
    const gf = p.gf_m2, gv = p.gv_m3;
    const byCode = {};
    records.forEach(r => { byCode[r.bkp_code] = r; });

    const bwTotal = EBKPH_BW_CODES.reduce((s, c) => s + (byCode[c]?.amount_chf || 0), 0);
    const total = EBKPH_ALL_CODES.reduce((s, c) => s + (byCode[c]?.amount_chf || 0), 0);

    // Get Bezugsmenge for a code from project fields
    const getBezug = (code) => {
        const meta = EBKPH_META[code];
        if (!meta.field) return null; // CHF-based codes (V, Y, Z) — compute from BW/total
        return p[meta.field] || null;
    };

    // For V (Planungskosten): Bezugsmenge = sum of B-J costs
    // For Y (Reserve): Bezugsmenge = sum of B-W costs
    // For Z (MWSt): Bezugsmenge = sum of B-Y costs
    const getChfBezug = (code) => {
        if (code === 'V') return 'BCDEFGHIJ'.split('').reduce((s, c) => s + (byCode[c]?.amount_chf || 0), 0) || null;
        if (code === 'Y') return bwTotal || null;
        if (code === 'Z') return (bwTotal + (byCode['Y']?.amount_chf || 0)) || null;
        return null;
    };

    const fmtDec = v => v != null ? CH.format(Number(v.toFixed(2))) : '';
    const fmtRound = v => v != null ? fmtN(Math.round(v)) : '';

    const row = (code) => {
        const meta = EBKPH_META[code];
        const chf = byCode[code]?.amount_chf || 0;

        // Bezugsmenge
        let bezugVal, bezugUnit, bezugRef;
        if (meta.unit === 'CHF') {
            bezugVal = getChfBezug(code);
            bezugUnit = 'CHF';
            bezugRef = meta.ref;
        } else {
            bezugVal = getBezug(code);
            bezugUnit = meta.unit;
            bezugRef = meta.ref;
        }

        // Kennwert = CHF / Bezugsmenge
        const kennwert = bezugVal && chf ? chf / bezugVal : null;

        // % B-W (only for B-W scope codes)
        const pctBW = bwTotal > 0 && EBKPH_BW_CODES.includes(code) ? ((chf / bwTotal) * 100).toFixed(1) + '\u2009%' : '';

        const chfM3 = gv && chf ? fmtDec(chf / gv) : '';
        const chfM2 = gf && chf ? fmtDec(chf / gf) : '';

        const bezugLabel = meta.unit === 'CHF' ? `CHF ${meta.ref}` : `${meta.unit} ${meta.ref}`;
        const kennwertLabel = meta.unit === 'CHF' ? '' : `CHF/${meta.ref}`;

        return `<tr>
            <td>${code}</td>
            <td>${esc(meta.name)}</td>
            <td class="num">${bezugVal ? fmtN(bezugVal) : EMPTY}</td>
            <td class="tbl-unit">${bezugLabel}</td>
            <td class="num">${kennwert != null ? fmtDec(kennwert) : EMPTY}</td>
            <td class="tbl-unit">${kennwertLabel}</td>
            <td class="num">${chf ? fmtN(chf) : EMPTY}</td>
            <td class="num">${pctBW || EMPTY}</td>
            <td class="num">${chfM3 || EMPTY}</td>
            <td class="num">${chfM2 || EMPTY}</td>
        </tr>`;
    };

    const summaryRow = (label, codes) => {
        const sum = codes.reduce((s, c) => s + (byCode[c]?.amount_chf || 0), 0);
        return `<tr class="ebkph-summary">
            <td>${codes[0]}\u2009\u2013\u2009${codes[codes.length - 1]}</td>
            <td><strong>${label}</strong></td>
            <td class="num"></td><td></td><td class="num"></td><td></td>
            <td class="num"><strong>${sum ? fmtN(sum) : ''}</strong></td>
            <td class="num"></td>
            <td class="num"><strong>${gv && sum ? fmtN(Math.round(sum / gv)) + '.\u2013' : ''}</strong></td>
            <td class="num"><strong>${gf && sum ? fmtN(Math.round(sum / gf)) + '.\u2013' : ''}</strong></td>
        </tr>`;
    };

    return `<div class="detail-card" style="margin-bottom:var(--space-4)">
        <div class="detail-card-header">Kosten nach Hauptgruppen eBKP-H (2012)</div>
        <div class="detail-card-body detail-card-body--table">
            <table class="detail-tbl">
                <thead><tr>
                    <th>Code</th>
                    <th>Bezeichnung</th>
                    <th class="num">Bezug</th>
                    <th></th>
                    <th class="num">Kennwert</th>
                    <th></th>
                    <th class="num">CHF</th>
                    <th class="num">% B\u2013W</th>
                    <th class="num">CHF/m\u00B3 GV</th>
                    <th class="num">CHF/m\u00B2 GF</th>
                </tr></thead>
                <tbody>
                    ${EBKPH_ALL_CODES.map(c => row(c)).join('')}
                    <tr class="ebkph-total">
                        <td></td><td>Total</td>
                        <td class="num"></td><td></td><td class="num"></td><td></td>
                        <td class="num">${total ? fmtN(total) : ''}</td>
                        <td class="num">${total ? '100\u2009%' : ''}</td>
                        <td class="num"></td><td class="num"></td>
                    </tr>
                </tbody>
                <tfoot>
                    ${summaryRow('Bauwerkskosten', EBKPH_CG_CODES)}
                    ${summaryRow('Erstellungskosten', EBKPH_BW_CODES)}
                    ${summaryRow('Anlagekosten', EBKPH_ALL_CODES)}
                </tfoot>
            </table>
        </div>
    </div>`;
}

// === Data Quality Card ===
function renderDataQuality(p, bkpCosts, ebkphCosts, benchmarks, indexRef, timeline, images) {
    // Checklist items: [label, hasData]
    const checks = [
        ['Kostendaten', p.construction_cost_total != null],
        ['Kostengliederung', bkpCosts.length > 0 || ebkphCosts.length > 0],
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
    const phaseLabel = phase || '\u2013';
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
function showDetail(id) {
    const p = App.db.getProject(id);
    if (!p) return;

    const returnUrl = new URLSearchParams(window.location.search);
    returnUrl.delete('detail');
    App.detailReturnParams = returnUrl.toString() ? '?' + returnUrl.toString() : window.location.pathname;

    const url = new URLSearchParams(window.location.search);
    url.set('detail', id);
    window.history.pushState({}, '', '?' + url.toString());

    const { bkp: bkpCosts, ebkph: ebkphCosts } = App.db.getCostRecords(id);
    const benchmarks = App.db.getBenchmarks(id);
    const indexRef = App.db.getIndexReference(id);
    const timeline = App.db.getTimeline(id);
    const allImages = App.db.getProjectImages(id, p.images_found);

    const maxBkpCost = bkpCosts.length > 0 ? Math.max(...bkpCosts.map(c => c.amount_chf || 0)) : 1;
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
            ${p.pdf_filename ? `<a class="btn btn-outline btn-sm" href="data/pdfs/${encodeURIComponent(p.pdf_filename)}" target="_blank">PDF öffnen</a>` : ''}
            <button class="btn btn-outline btn-sm" id="detailBackBtn">
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
            <div class="detail-subtitle">${esc(displayMuni(p))}${p.canton ? ' ' + esc(p.canton) : ''} \u00B7 ${p.completion_year ? esc(String(p.completion_year)) : EMPTY}</div>
            <div class="detail-hero-tags">${categoryTagHTML(p)} ${tagHTML(p.arbeiten_type)} ${srcTagHTML(p.data_source)} ${countryTagHTML(p.country)} ${qualityTagHTML(p._qualityGrade || computeQualityGrade(p))}</div>
            <div class="detail-hero-kpis">
                <div class="hero-kpi"><div class="hero-kpi-label">CHF/m\u00B2 ${abbr('GF', 'Geschossfläche')}</div><div class="hero-kpi-value${p.chf_per_m2_gf ? ' accent' : ''}">${p.chf_per_m2_gf ? fmtN(p.chf_per_m2_gf) : EMPTY}</div></div>
                <div class="hero-kpi"><div class="hero-kpi-label">CHF/m\u00B3 ${abbr('GV', 'Gebäudevolumen')}</div><div class="hero-kpi-value">${p.chf_per_m3_gv ? fmtN(p.chf_per_m3_gv) : EMPTY}</div></div>
                <div class="hero-kpi"><div class="hero-kpi-label">${abbr('GF', 'Geschossfläche')}</div><div class="hero-kpi-value">${p.gf_m2 ? fmtArea(p.gf_m2) : EMPTY}</div></div>
                <div class="hero-kpi"><div class="hero-kpi-label">${abbr('GV', 'Gebäudevolumen')}</div><div class="hero-kpi-value">${p.gv_m3 ? fmtVol(p.gv_m3) : EMPTY}</div></div>
                <div class="hero-kpi"><div class="hero-kpi-label">Gesamtkosten</div><div class="hero-kpi-value">${p.construction_cost_total ? fmtMio(p.construction_cost_total) : EMPTY}</div></div>
            </div>
        </div>
    </div>`;

    // --- Section Navigation ---
    html += `<nav class="detail-section-nav" aria-label="Sektionen">
        <a href="#sec-beschrieb">Beschrieb</a>
        <a href="#sec-projektdaten">Projektdaten</a>
        <a href="#sec-vergleich">Vergleich</a>
        <a href="#sec-sia416">${abbr('SIA 416', 'Schweizer Ingenieur- und Architektenverein Norm 416')}</a>
        <a href="#sec-bkp">${abbr('BKP', 'Baukostenplan')}</a>
        <a href="#sec-ebkph">${abbr('eBKP-H', 'Elementbasierter Baukostenplan Hochbau')}</a>
        <a href="#sec-index">Index &amp; Termine</a>
    </nav>`;

    // --- Projektbeschrieb (full width) ---
    const desc = p.project_description ? esc(p.project_description) : '';
    const descLong = desc.split(/\s+/).length > 80;

    html += `<div class="detail-card" id="sec-beschrieb" style="margin-bottom:var(--space-4);scroll-margin-top:48px">
        <div class="detail-card-header">Projektbeschrieb</div>
        <div class="detail-card-body">
            ${desc
                ? `<div class="description-text${descLong ? ' truncated' : ''}">${desc}</div>
                   ${descLong ? '<button class="btn btn-sm btn-outline desc-toggle">Mehr anzeigen</button>' : ''}`
                : '<span class="detail-field-value empty">Keine Angabe</span>'}
        </div>
    </div>`;

    // --- Projektdaten + Standort ---
    const addrParts = [p.street, p.postal_code, displayMuni(p)].filter(Boolean);
    const addrLine = addrParts.length > 0 ? addrParts.join(' ') : null;

    html += `<div class="detail-grid" id="sec-projektdaten" style="scroll-margin-top:48px">
        <div class="detail-card"><div class="detail-card-header">Projektdaten</div><div class="detail-card-body">
            <div class="sia-section-title">Projekt</div>
            ${detailField('Kategorie', p.category_label || p.category)}
            ${detailField('Art der Arbeiten', p.arbeiten_type ? tagHTML(p.arbeiten_type) : null)}
            ${detailField('Fertigstellung', p.completion_date || (p.completion_year ? String(p.completion_year) : null))}
            ${detailField('Bauweise', p.construction_method)}
            ${detailField('Energiestandard', p.energy_standard)}
            ${detailField('Beschaffungsmodell', p.procurement_model)}

            <div class="sia-section-title" style="margin-top:var(--space-3)">Beteiligte</div>
            ${detailField('Bauherr (Org.)', p.client_org)}
            ${detailField('Bauherrschaft', p.client_name)}
            ${detailField('Nutzer', p.user_org)}
            ${detailField('Architektur', p.architect)}
            ${detailField('Generalplaner', p.general_planner)}
            ${detailField('Generalunternehmer', p.general_contractor)}

            <div class="sia-section-title" style="margin-top:var(--space-3)">Quelle</div>
            ${detailField('Datenquelle', p.data_source ? srcTagHTML(p.data_source) : null)}
        </div></div>
        <div class="detail-card"><div class="detail-card-header">Standort</div><div class="detail-card-body standort-card">
            <div class="standort-coords">
                ${detailField('WGS84', p.coord_lat && p.coord_lng ? `${Number(p.coord_lat).toFixed(6)}, ${Number(p.coord_lng).toFixed(6)}` : null)}
                ${detailField('Google Maps', p.coord_lat && p.coord_lng
                    ? `<a href="https://www.google.com/maps/search/?api=1&query=${p.coord_lat},${p.coord_lng}" target="_blank" class="standort-link">Auf externer Karte anzeigen <span class="material-icons-outlined">open_in_new</span></a>` : null)}
                ${detailField('Google Street View', p.coord_lat && p.coord_lng
                    ? `<a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${p.coord_lat},${p.coord_lng}" target="_blank" class="standort-link">Auf externer Karte anzeigen <span class="material-icons-outlined">open_in_new</span></a>` : null)}
                ${detailField('map.geo.admin.ch', p.coord_lat && p.coord_lng
                    ? (() => { const lv = wgs84ToLV95(Number(p.coord_lat), Number(p.coord_lng)); return `<a href="https://map.geo.admin.ch/#/map?lang=de&center=${lv.E},${lv.N}&z=12&crosshair=marker&topic=ech&layers=ch.swisstopo.amtliches-strassenverzeichnis;ch.bfs.gebaeude_wohnungs_register&bgLayer=ch.swisstopo.swissimage" target="_blank" class="standort-link">Auf externer Karte anzeigen <span class="material-icons-outlined">open_in_new</span></a>`; })() : null)}
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
                    <td>${p.country ? esc(p.country) : EMPTY}</td><td>${p.canton ? esc(p.canton) : EMPTY}</td>
                    <td>${displayMuni(p) ? esc(displayMuni(p)) : EMPTY}</td><td>${p.postal_code ? esc(p.postal_code) : EMPTY}</td>
                    <td>${p.street ? esc(p.street) : EMPTY}</td><td>${p.house_number ? esc(p.house_number) : EMPTY}</td>
                </tr></tbody>
            </table>
        </div></div>
    </div>`;

    // --- Peer comparison + Datenqualität ---
    html += `<div class="detail-grid" id="sec-vergleich" style="scroll-margin-top:48px">
        ${p.chf_per_m2_gf
            ? renderPeerComparison(p)
            : `<div class="detail-card">
                <div class="detail-card-header">Vergleich mit ähnlichen Projekten</div>
                <div class="detail-card-body"><span class="detail-field-value empty">Keine Vergleichsdaten (CHF/m\u00B2 ${abbr('GF', 'Geschossfläche')} fehlt)</span></div>
            </div>`}
        ${renderDataQuality(p, bkpCosts, ebkphCosts, benchmarks, indexRef, timeline, allImages)}
    </div>`;

    // --- SIA 416 + Sonstige Kennzahlen ---
    const ratioGvGf = p.gv_m3 && p.gf_m2 ? (p.gv_m3 / p.gf_m2).toFixed(2) : null;
    const ratioNgfGf = p.ngf_m2 && p.gf_m2 ? ((p.ngf_m2 / p.gf_m2) * 100).toFixed(1) + ' %' : null;
    const ratioFawGf = p.faw_m2 && p.gf_m2 ? (p.faw_m2 / p.gf_m2).toFixed(2) : null;
    const ratioFbGf = p.fb_m2 && p.gf_m2 ? (p.fb_m2 / p.gf_m2).toFixed(2) : null;

    // Bar chart data for Sonstige Kennzahlen
    const _gf = p.gf_m2, _ngf = p.ngf_m2, _kf = _gf && _ngf ? _gf - _ngf : null;
    const _pctOf = (v, b) => v != null && b ? Math.round((v / b) * 100) : null;
    const _pctNgf = _pctOf(_ngf, _gf), _pctKf = _pctOf(_kf, _gf);
    const _pctNf = _pctOf(p.nf_m2, _gf), _pctFf = _pctOf(p.ff_m2, _gf), _pctVf = _pctOf(p.vf_m2, _gf);
    const _pctHnf = _pctOf(p.hnf_m2, _gf), _pctNnf = _pctOf(p.nnf_m2, _gf);
    const _bar = (label, pct, cls) => pct != null ? `<div class="sia-bar ${cls}" style="width:${pct}%"><span>${label} ${pct}%</span></div>` : '';

    html += `<div class="detail-grid" id="sec-sia416" style="scroll-margin-top:48px">
        ${renderSIA416(p)}
        <div class="detail-card">
            <div class="detail-card-header">Sonstige Kennzahlen</div>
            <div class="detail-card-body">
                <div class="sia-section-title">Gebäudekennzahlen</div>
                ${detailField('Geschosse', p.floors)}
                ${detailField('Arbeitsplätze', p.workplaces)}

                <div class="sia-section-title" style="margin-top:var(--space-3)">Formquotienten</div>
                ${detailField('GV/GF', ratioGvGf)}
                ${detailField('NGF/GF', ratioNgfGf)}
                ${detailField('FAW/GF', ratioFawGf)}
                ${detailField('FB/GF', ratioFbGf)}

                ${(() => {
                    if (!_gf) return '';
                    const missing = [];
                    // Row 2: NGF + KF = GF
                    const r2sum = (_pctNgf || 0) + (_pctKf || 0);
                    const r2gap = _pctNgf != null || _pctKf != null ? Math.max(0, 100 - r2sum) : 0;
                    if (_pctNgf == null) missing.push('NGF');
                    if (_pctKf == null && _pctNgf != null) missing.push('KF');
                    // Row 3: NF + FF + VF = NGF
                    const r3sum = (_pctNf || 0) + (_pctFf || 0) + (_pctVf || 0);
                    const r3gap = _pctNf != null || _pctFf != null || _pctVf != null ? Math.max(0, (_pctNgf || 100) - r3sum) : 0;
                    if (_pctNgf != null && _pctNf == null) missing.push('NF');
                    if (_pctNgf != null && _pctFf == null) missing.push('FF');
                    if (_pctNgf != null && _pctVf == null) missing.push('VF');
                    // Row 4: HNF + NNF = NF
                    const r4sum = (_pctHnf || 0) + (_pctNnf || 0);
                    const r4gap = _pctHnf != null || _pctNnf != null ? Math.max(0, (_pctNf || 100) - r4sum) : 0;
                    if (_pctNf != null && _pctHnf == null) missing.push('HNF');
                    if (_pctNf != null && _pctNnf == null) missing.push('NNF');

                    const gapBar = (pct) => pct > 0 ? `<div class="sia-bar sia-bar-gap" style="width:${pct}%"><span>?</span></div>` : '';

                    return `<div class="sia-section-title" style="margin-top:var(--space-3)">Flächenaufteilung</div>
                    <div style="margin-top:var(--space-4)">
                        <div class="sia-bar-chart">
                            <div class="sia-bar-track">${_bar('GF', 100, 'sia-bar-l0')}</div>
                            ${_pctNgf != null || _pctKf != null ? `<div class="sia-bar-track sia-bar-split">${_bar('NGF', _pctNgf, 'sia-bar-l1')}${_bar('KF', _pctKf, 'sia-bar-l1-alt')}${gapBar(r2gap)}</div>` : ''}
                            ${_pctNf != null || _pctFf != null || _pctVf != null ? `<div class="sia-bar-track sia-bar-split">${_bar('NF', _pctNf, 'sia-bar-l2')}${_bar('FF', _pctFf, 'sia-bar-l2-alt')}${_bar('VF', _pctVf, 'sia-bar-l2-alt')}${gapBar(r3gap)}</div>` : ''}
                            ${_pctHnf != null || _pctNnf != null ? `<div class="sia-bar-track sia-bar-split">${_bar('HNF', _pctHnf, 'sia-bar-l3')}${_bar('NNF', _pctNnf, 'sia-bar-l3-alt')}${gapBar(r4gap)}</div>` : ''}
                        </div>
                        ${missing.length > 0 ? `<div class="sia-bar-missing"><span class="material-icons-outlined">info</span> Unvollständig: ${missing.join(', ')} fehlt</div>` : ''}
                    </div>`;
                })()}
            </div>
        </div>
    </div>`;

    // --- BKP ---
    const bkpByCode = {};
    bkpCosts.forEach(c => { bkpByCode[c.bkp_code] = c; });

    html += `<div class="detail-card" id="sec-bkp" style="margin-bottom:var(--space-4);scroll-margin-top:48px">
        <div class="detail-card-header"><span>${abbr('BKP', 'Baukostenplan')}-Kostenstruktur</span></div>
        <div class="detail-card-body detail-card-body--table">
            <table class="detail-tbl">
                <thead><tr>
                    <th>Code</th>
                    <th>Bezeichnung</th>
                    <th class="num">CHF</th>
                    <th class="num">CHF/m\u00B3 GV</th>
                    <th class="num">CHF/m\u00B2 GF</th>
                    <th></th>
                </tr></thead>
                <tbody>
            ${BKP_STRUCTURE.map(s => {
                const c = bkpByCode[s.code];
                const amt = c?.amount_chf;
                const barW = amt ? Math.round((amt / maxBkpCost) * 100) : 0;
                const chfM3 = amt && p.gv_m3 ? fmtN(Math.round(amt / p.gv_m3)) : EMPTY;
                const chfM2 = amt && p.gf_m2 ? fmtN(Math.round(amt / p.gf_m2)) : EMPTY;
                return `<tr class="${s.main ? 'bkp-main' : 'bkp-sub'}">
                    <td>${s.code}</td>
                    <td>${esc(s.name)}</td>
                    <td class="num">${amt ? fmtN(amt) : EMPTY}</td>
                    <td class="num">${chfM3}</td>
                    <td class="num">${chfM2}</td>
                    <td class="bkp-bar-cell"><div class="cost-bar-wrap">${barW ? `<div class="cost-bar" style="width:${barW}%"></div>` : ''}</div></td>
                </tr>`;
            }).join('')}
                </tbody>
            </table>
        </div>
    </div>`;

    // --- eBKP-H ---
    html += `<div id="sec-ebkph" style="scroll-margin-top:48px">`;
    html += renderEbkph(p, ebkphCosts);
    html += `</div>`;

    // --- Baupreisindex + Termine (side by side) ---
    const milestoneLabels = { planungsbeginn: 'Planungsbeginn', wettbewerb: 'Wettbewerb', baubeginn: 'Baubeginn', bauende: 'Bauende', bauzeit_monate: 'Bauzeit (Monate)' };
    const timelineMap = {};
    timeline.forEach(t => { timelineMap[t.milestone] = t.value; });

    html += `<div class="detail-grid" id="sec-index" style="scroll-margin-top:48px">
        <div class="detail-card">
            <div class="detail-card-header">Baupreisindex</div>
            <div class="detail-card-body">
                ${detailField('Index', indexRef?.index_name)}
                ${detailField('Datum', indexRef?.index_date)}
                ${detailField('Wert', indexRef?.index_value)}
                ${detailField('Basis', indexRef?.basis_date ? `${indexRef.basis_date} = ${indexRef.basis_value}` : null)}
            </div>
        </div>
        <div class="detail-card">
            <div class="detail-card-header">Termine</div>
            <div class="detail-card-body">
                ${Object.entries(milestoneLabels).map(([key, label]) => detailField(label, timelineMap[key])).join('')}
            </div>
        </div>
    </div>`;


    // Render
    const el = document.getElementById('detailContent');
    el.innerHTML = html;
    document.getElementById('detailView').classList.add('active');
    document.getElementById('searchSection').style.display = 'none';
    document.getElementById('detailView').querySelector('.detail-scroll').scrollTop = 0;

    if (p.coord_lat && p.coord_lng) initDetailMap(p.coord_lat, p.coord_lng);

    // Wire gallery clicks (delegated)
    const gallery = el.querySelector('.detail-gallery');
    if (gallery) {
        gallery.addEventListener('click', e => {
            const img = e.target.closest('.clickable[data-image-index]');
            if (img && _galleryImages.length > 0) {
                openCarousel(_galleryImages, parseInt(img.dataset.imageIndex, 10));
            }
        });
    }

    // Wire back button
    document.getElementById('detailBackBtn')?.addEventListener('click', hideDetail);

    // Wire tag clicks — return to main view with filter
    el.addEventListener('click', e => {
        const tag = e.target.closest('.tag[data-filter-key]');
        if (!tag) return;
        const key = tag.dataset.filterKey;
        const val = tag.dataset.filterValue;
        hideDetail();
        if (!App.filters[key]) App.filters[key] = new Set();
        App.filters[key].add(val);
        populateMultiFilters();
        applyFilters();
    });

    // Wire description toggle
    const descToggle = el.querySelector('.desc-toggle');
    if (descToggle) {
        descToggle.addEventListener('click', () => {
            const textEl = descToggle.previousElementSibling;
            textEl.classList.toggle('truncated');
            descToggle.textContent = textEl.classList.contains('truncated') ? 'Mehr anzeigen' : 'Weniger anzeigen';
        });
    }

    // Wire SIA 416 expand/collapse
    const siaToggle = el.querySelector('.sia-toggle');
    if (siaToggle) {
        siaToggle.addEventListener('click', () => {
            const layout = el.querySelector('.sia-layout');
            layout.classList.toggle('sia-truncated');
            siaToggle.textContent = layout.classList.contains('sia-truncated') ? 'Mehr anzeigen' : 'Weniger anzeigen';
        });
    }

    // Wire section nav smooth scrolling within detail overlay
    const scrollContainer = el.closest('.detail-scroll');
    const navLinks = el.querySelectorAll('.detail-section-nav a');
    const sections = Array.from(navLinks)
        .map(a => el.querySelector(a.getAttribute('href')))
        .filter(Boolean);

    navLinks.forEach(a => {
        a.addEventListener('click', e => {
            e.preventDefault();
            const target = el.querySelector(a.getAttribute('href'));
            if (target && scrollContainer) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Track which section is in view via scroll position
    if (scrollContainer && sections.length) {
        let ticking = false;
        let activeLink = null;
        const updateActiveNav = () => {
            const scrollTop = scrollContainer.scrollTop;
            const offset = 64;
            let current = sections[0];
            for (const sec of sections) {
                if (sec.offsetTop - offset <= scrollTop) {
                    current = sec;
                } else {
                    break;
                }
            }
            const newLink = navLinks[sections.indexOf(current)];
            if (newLink !== activeLink) {
                if (activeLink) activeLink.classList.remove('active');
                if (newLink) newLink.classList.add('active');
                activeLink = newLink;
            }
        };

        scrollContainer.addEventListener('scroll', () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(() => { updateActiveNav(); ticking = false; });
            }
        }, { passive: true });

        // Set initial state after layout
        requestAnimationFrame(updateActiveNav);
    }

    // Scroll to top without stealing visible focus
    scrollContainer?.scrollTo(0, 0);
}

function hideDetail() {
    document.getElementById('detailView').classList.remove('active');
    document.getElementById('searchSection').style.display = '';
    if (detailMapInstance) { detailMapInstance.remove(); detailMapInstance = null; }
    window.history.pushState({}, '', App.detailReturnParams || window.location.pathname);
    activateView(App.currentView);
    applyFilters();
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
    const arts = App.filterOptions.arbeitenTypes || [];
    const cantons = App.filterOptions.cantons || [];

    document.getElementById('estimatorContent').innerHTML = `
        <div class="detail-back" id="estimatorBackBtn">
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
    document.getElementById('estimatorBackBtn').addEventListener('click', hideEstimator);
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
    let relaxedNote = '';
    if (peers.length < 3 && canton) {
        peers = App.allProjects.filter(p => p.chf_per_m2_gf != null && p.arbeiten_type === art && p.category === cat);
        relaxedNote = 'Kantonfilter wurde entfernt (zu wenige Projekte). ';
    }
    if (peers.length < 3) {
        peers = App.allProjects.filter(p => p.chf_per_m2_gf != null && p.arbeiten_type === art);
        relaxedNote += 'Kategoriefilter wurde entfernt (zu wenige Projekte).';
    }

    if (peers.length < 2) {
        document.getElementById('estResults').innerHTML = '<div class="warning-banner"><span class="material-icons-outlined">warning</span> Zu wenige vergleichbare Projekte gefunden.</div>';
        return;
    }

    const stats = computeStats(peers.map(p => p.chf_per_m2_gf));
    let warn = peers.length < 5 ? `<div class="warning-banner"><span class="material-icons-outlined">warning</span> Nur ${peers.length} vergleichbare Projekte. Werte nicht belastbar (n &lt; 5).</div>` : '';
    if (relaxedNote) warn += `<div class="warning-banner"><span class="material-icons-outlined">info</span> ${esc(relaxedNote)}</div>`;

    document.getElementById('estResults').innerHTML = `
        <div class="est-step">
            <div class="est-step-title">Schritt 2: Vergleichsmenge (n = ${peers.length})</div>
            ${warn}
            <div class="table-wrap" style="max-height:300px;overflow-y:auto">
                <table class="data-table" style="font-size:var(--font-size-xs)">
                    <thead><tr><th>Jahr</th><th>Projekt</th><th>Ort</th><th class="num">GF m\u00B2</th><th class="num">CHF/m\u00B2</th><th>Quelle</th></tr></thead>
                    <tbody>${peers.map(p => `<tr data-id="${parseInt(p.id)}" style="cursor:pointer">
                        <td>${p.completion_year ? esc(String(p.completion_year)) : EMPTY}</td><td>${esc(p.project_name)}</td>
                        <td>${esc(p.municipality || '')} ${esc(p.canton || '')}</td>
                        <td class="num">${p.gf_m2 ? fmtN(p.gf_m2) : EMPTY}</td>
                        <td class="num" style="font-weight:600">${fmtN(p.chf_per_m2_gf)}</td>
                        <td>${srcTagHTML(p.data_source)}</td>
                    </tr>`).join('')}</tbody>
                </table>
            </div>
        </div>
        <div class="est-step" id="estStep3">
            <div class="est-step-title">Schritt 3: Kostenbandbreite (${abbr('GF', 'Geschossfläche')} = ${fmtN(gf)} m\u00B2)</div>
            <div style="font-size:var(--font-size-xs);color:var(--neutral-500);margin-bottom:var(--space-2)">CHF/m\u00B2 ${abbr('GF', 'Geschossfläche')} Verteilung</div>
            ${renderBoxPlot(stats)}
            <div style="margin-top:var(--space-6)">
                <div style="font-size:var(--font-size-sm);font-weight:600;margin-bottom:var(--space-3)">Geschätzte Gebäudekosten (BKP 2)</div>
                <div class="est-result-row"><span class="est-result-label">P25 (konservativ)</span><span class="est-result-value">${fmtMio(stats.p25 * gf)}</span></div>
                <div class="est-result-row"><span class="est-result-label">Median</span><span class="est-result-value primary">${fmtMio(stats.median * gf)}</span></div>
                <div class="est-result-row"><span class="est-result-label">P75 (obere Bandbreite)</span><span class="est-result-value">${fmtMio(stats.p75 * gf)}</span></div>
            </div>
        </div>
    `;

    // Wire click delegation for estimator peer table rows
    const estResultsEl = document.getElementById('estResults');
    estResultsEl.querySelectorAll('tr[data-id]').forEach(row => {
        row.addEventListener('click', () => showDetail(parseInt(row.dataset.id)));
    });

    // Scroll to Schritt 3 so user sees the cost estimate
    document.getElementById('estStep3')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
