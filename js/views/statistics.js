/**
 * statistics.js — Aggregate benchmark statistics view
 */
window.StatisticsView = {
    filters: {},

    render(db, container) {
        this.db = db;
        this.container = container;
        this.filterOptions = db.getFilterOptions();
        this.update();
    },

    update() {
        const db = this.db;
        const container = this.container;
        container.innerHTML = "";

        const layout = document.createElement("div");
        layout.className = "page-layout";

        // Filter panel
        const filterPanel = FiltersComponent.render(
            this.filterOptions,
            this.filters,
            (key, value) => this.onFilterChange(key, value)
        );
        layout.appendChild(filterPanel);

        // Main
        const main = document.createElement("div");

        const h2 = document.createElement("h2");
        h2.textContent = "Benchmark-Statistik";
        h2.style.marginBottom = "16px";
        main.appendChild(h2);

        // Overall stats
        const stats = db.getStatistics(this.filters);

        // Warning for small n
        const warning = StatsCardComponent.renderWarning(stats.withCostData);
        if (warning) main.appendChild(warning);

        // Summary cards
        main.appendChild(StatsCardComponent.renderStatsRow(stats));

        // Box stats
        const box = StatsCardComponent.renderBoxStats(stats);
        if (box) {
            box.classList.add("mb-16");
            main.appendChild(box);
        }

        // Category breakdown
        const catStats = db.getCategoryStats();
        const maxAvg = Math.max(...catStats.map(c => c.avg_chf_m2 || 0));
        const fmt = v => v != null ? new Intl.NumberFormat("de-CH").format(Math.round(v)) : "\u2014";

        const catCard = document.createElement("div");
        catCard.className = "card";
        const catHeader = document.createElement("div");
        catHeader.className = "card-header";
        catHeader.textContent = "Kennwerte nach Kategorie";
        catCard.appendChild(catHeader);

        const catBody = document.createElement("div");
        catBody.className = "card-body";

        const catTable = document.createElement("table");
        catTable.className = "data-table stats-table";
        catTable.innerHTML = `<thead><tr>
            <th>Kategorie</th>
            <th class="num">n</th>
            <th class="num">Mit CHF/m\u00B2</th>
            <th class="num">Min</th>
            <th class="num">Mittel</th>
            <th class="num">Max</th>
            <th></th>
        </tr></thead>`;

        const tbody = document.createElement("tbody");
        catStats.forEach(cat => {
            const tr = document.createElement("tr");
            tr.style.cursor = "default";
            const barWidth = cat.avg_chf_m2 ? Math.round((cat.avg_chf_m2 / maxAvg) * 100) : 0;

            tr.innerHTML = `
                <td><strong>${cat.category_label || cat.category}</strong></td>
                <td class="num">${cat.total}</td>
                <td class="num">${cat.with_benchmarks}${cat.with_benchmarks < 5 ? ' <span style="color:var(--color-warning)">*</span>' : ''}</td>
                <td class="num">${fmt(cat.min_chf_m2)}</td>
                <td class="num"><strong>${fmt(cat.avg_chf_m2)}</strong></td>
                <td class="num">${fmt(cat.max_chf_m2)}</td>
                <td class="bar-cell"><div class="bar" style="width:${barWidth}%"></div></td>
            `;
            tbody.appendChild(tr);
        });
        catTable.appendChild(tbody);
        catBody.appendChild(catTable);

        const footnote = document.createElement("div");
        footnote.className = "text-sm text-muted mt-16";
        footnote.innerHTML = "* Weniger als 5 Projekte mit Kostenkennwerten &mdash; Werte nicht belastbar.<br>Alle Kosten wie im PDF erfasst, <strong>nicht</strong> teuerungsbereinigt.";
        catBody.appendChild(footnote);

        catCard.appendChild(catBody);
        main.appendChild(catCard);

        layout.appendChild(main);
        container.appendChild(layout);
    },

    onFilterChange(key, value) {
        if (key === "reset") {
            this.filters = {};
        } else {
            if (value) {
                this.filters[key] = value;
            } else {
                delete this.filters[key];
            }
        }
        this.update();
    },
};
