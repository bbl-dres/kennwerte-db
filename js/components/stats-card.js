/**
 * stats-card.js — Statistics display components
 */
window.StatsCardComponent = {
    renderCard(value, label, accent) {
        const card = document.createElement("div");
        card.className = "stat-card" + (accent ? " accent" : "");

        const valEl = document.createElement("div");
        valEl.className = "stat-value";
        valEl.textContent = value != null ? value : "\u2014";
        card.appendChild(valEl);

        const lblEl = document.createElement("div");
        lblEl.className = "stat-label";
        lblEl.textContent = label;
        card.appendChild(lblEl);

        return card;
    },

    renderStatsRow(stats) {
        const grid = document.createElement("div");
        grid.className = "stats-grid";

        grid.appendChild(this.renderCard(stats.totalProjects, "Projekte total"));
        grid.appendChild(this.renderCard(stats.withCostData, "Mit Kostendaten"));
        grid.appendChild(this.renderCard(stats.withGF, "Mit GF"));

        if (stats.chfPerM2.median != null) {
            grid.appendChild(this.renderCard(
                new Intl.NumberFormat("de-CH").format(stats.chfPerM2.median),
                "Median CHF/m\u00B2 GF", true
            ));
        }

        return grid;
    },

    renderWarning(n) {
        if (n >= 5) return null;
        const div = document.createElement("div");
        div.className = "warning-banner";
        div.textContent = `Achtung: Die Vergleichsmenge enthaelt nur ${n} Projekte mit Kostenkennwerten. Statistische Aussagen sind bei n < 5 nicht belastbar.`;
        return div;
    },

    renderBoxStats(stats) {
        if (!stats.chfPerM2.median) return null;
        const s = stats.chfPerM2;
        const card = document.createElement("div");
        card.className = "card";

        const header = document.createElement("div");
        header.className = "card-header";
        header.textContent = "CHF/m\u00B2 GF (BKP 2) \u2014 Verteilung";
        card.appendChild(header);

        const body = document.createElement("div");
        body.className = "card-body";

        const fmt = v => v != null ? new Intl.NumberFormat("de-CH").format(Math.round(v)) : "\u2014";

        const table = document.createElement("table");
        table.className = "data-table";
        table.innerHTML = `
            <thead><tr>
                <th>Min</th><th>P25</th><th>Median</th><th>P75</th><th>Max</th><th>Mittelwert</th>
            </tr></thead>
            <tbody><tr>
                <td class="num">${fmt(s.min)}</td>
                <td class="num">${fmt(s.p25)}</td>
                <td class="num"><strong>${fmt(s.median)}</strong></td>
                <td class="num">${fmt(s.p75)}</td>
                <td class="num">${fmt(s.max)}</td>
                <td class="num">${fmt(s.mean)}</td>
            </tr></tbody>
        `;
        body.appendChild(table);
        card.appendChild(body);
        return card;
    },
};
