/**
 * project-detail.js — Single project detail view
 */
window.ProjectDetailView = {
    render(db, container, projectId) {
        container.innerHTML = "";
        const project = db.getProject(projectId);

        if (!project) {
            container.innerHTML = '<div class="empty-state"><h3>Projekt nicht gefunden</h3></div>';
            return;
        }

        // Back link
        const back = document.createElement("a");
        back.className = "detail-back";
        back.href = "#/projects";
        back.innerHTML = "\u2190 Zurueck zur Liste";
        container.appendChild(back);

        // Header
        const header = document.createElement("div");
        header.className = "detail-header";
        const h2 = document.createElement("h2");
        h2.textContent = project.project_name;
        header.appendChild(h2);

        const subtitle = document.createElement("div");
        subtitle.className = "detail-subtitle";
        const parts = [project.municipality, project.canton, project.completion_year].filter(Boolean);
        subtitle.textContent = parts.join(" \u2014 ") + (project.category_label ? ` \u00B7 ${project.category_label}` : "");
        header.appendChild(subtitle);
        container.appendChild(header);

        // Metadata grid
        const metaGrid = document.createElement("div");
        metaGrid.className = "detail-grid";

        const fields = [
            ["Datenquelle", project.data_source],
            ["Bauherr (Organisation)", project.client_org],
            ["Art der Arbeiten", FiltersComponent.formatArbeitenType(project.arbeiten_type)],
            ["Bauherrschaft", project.client_name],
            ["Nutzer", project.user_org],
            ["Architektur", project.architect],
            ["Generalplaner", project.general_planner],
            ["Generalunternehmer", project.general_contractor],
            ["Energiestandard", project.energy_standard],
        ];

        fields.forEach(([label, value]) => {
            const field = document.createElement("div");
            field.className = "detail-field";
            const lbl = document.createElement("div");
            lbl.className = "label";
            lbl.textContent = label;
            field.appendChild(lbl);
            const val = document.createElement("div");
            val.className = "value" + (!value ? " empty" : "");
            val.textContent = value || "Keine Angabe";
            field.appendChild(val);
            metaGrid.appendChild(field);
        });

        container.appendChild(this.wrapCard("Projektdaten", metaGrid));

        // Quantities
        const quantGrid = document.createElement("div");
        quantGrid.className = "detail-grid";
        const fmt = v => v != null ? new Intl.NumberFormat("de-CH").format(Math.round(v)) : null;

        const quantFields = [
            ["Geschossflaeche (GF)", project.gf_m2 ? `${fmt(project.gf_m2)} m\u00B2` : null],
            ["Gebaeudevolumen (GV)", project.gv_m3 ? `${fmt(project.gv_m3)} m\u00B3` : null],
            ["Nettogeschossflaeche (NGF)", project.ngf_m2 ? `${fmt(project.ngf_m2)} m\u00B2` : null],
            ["Geschosse", project.floors],
            ["Arbeitsplaetze", project.workplaces ? fmt(project.workplaces) : null],
            ["Gesamtkosten", project.construction_cost_total ? `CHF ${fmt(project.construction_cost_total)}` : null],
            ["CHF/m\u00B2 GF", project.chf_per_m2_gf ? `CHF ${fmt(project.chf_per_m2_gf)}` : null],
        ];

        quantFields.forEach(([label, value]) => {
            const field = document.createElement("div");
            field.className = "detail-field";
            const lbl = document.createElement("div");
            lbl.className = "label";
            lbl.textContent = label;
            field.appendChild(lbl);
            const val = document.createElement("div");
            val.className = "value" + (!value ? " empty" : "");
            val.textContent = value || "Keine Angabe";
            if (value) val.style.fontWeight = "600";
            field.appendChild(val);
            quantGrid.appendChild(field);
        });

        container.appendChild(this.wrapCard("Mengen und Kennwerte", quantGrid));

        // BKP Cost breakdown
        const costs = db.getCostRecords(projectId);
        if (costs.length > 0) {
            const maxCost = Math.max(...costs.map(c => c.amount_chf || 0));
            const costTable = document.createElement("table");
            costTable.className = "data-table cost-table";
            costTable.innerHTML = `<thead><tr>
                <th>BKP</th><th>Bezeichnung</th><th class="num">CHF</th><th></th>
            </tr></thead>`;
            const tbody = document.createElement("tbody");

            costs.forEach(cost => {
                const tr = document.createElement("tr");
                tr.style.cursor = "default";
                const isMain = cost.bkp_code.length === 1;

                tr.innerHTML = `
                    <td style="font-family:var(--font-mono);${isMain ? 'font-weight:700' : ''}">${cost.bkp_code}</td>
                    <td${isMain ? ' style="font-weight:600"' : ''}>${cost.bkp_name || ''}</td>
                    <td class="amount"${isMain ? ' style="font-weight:700"' : ''}>${fmt(cost.amount_chf)}</td>
                    <td class="cost-bar-cell"><div class="cost-bar" style="width:${Math.round((cost.amount_chf / maxCost) * 100)}%"></div></td>
                `;
                tbody.appendChild(tr);
            });

            costTable.appendChild(tbody);
            container.appendChild(this.wrapCard("BKP-Kostenstruktur", costTable));
        }

        // Benchmarks
        const benchmarks = db.getBenchmarks(projectId);
        if (benchmarks.length > 0) {
            const bmDiv = document.createElement("div");
            bmDiv.className = "detail-grid";
            benchmarks.forEach(bm => {
                const field = document.createElement("div");
                field.className = "detail-field";
                const lbl = document.createElement("div");
                lbl.className = "label";
                lbl.textContent = bm.benchmark_type.replace(/_/g, " ");
                field.appendChild(lbl);
                const val = document.createElement("div");
                val.className = "value";
                val.style.fontWeight = "700";
                val.style.fontSize = "18px";
                val.textContent = fmt(bm.value);
                field.appendChild(val);
                bmDiv.appendChild(field);
            });
            container.appendChild(this.wrapCard("Kennwerte (aus PDF)", bmDiv));
        }

        // Index reference
        const idx = db.getIndexReference(projectId);
        if (idx) {
            const idxDiv = document.createElement("div");
            idxDiv.className = "detail-grid";
            [
                ["Index", idx.index_name],
                ["Indexdatum", idx.index_date],
                ["Indexwert", idx.index_value],
                ["Basis", idx.basis_date],
                ["Basiswert", idx.basis_value],
            ].forEach(([label, value]) => {
                if (value == null) return;
                const field = document.createElement("div");
                field.className = "detail-field";
                const lbl = document.createElement("div");
                lbl.className = "label";
                lbl.textContent = label;
                field.appendChild(lbl);
                const val = document.createElement("div");
                val.className = "value";
                val.textContent = value;
                field.appendChild(val);
                idxDiv.appendChild(field);
            });
            container.appendChild(this.wrapCard("Baupreisindex", idxDiv));
        }

        // Timeline
        const timeline = db.getTimeline(projectId);
        if (timeline.length > 0) {
            const tlDiv = document.createElement("div");
            tlDiv.className = "detail-grid";
            const milestoneLabels = {
                planungsbeginn: "Planungsbeginn",
                wettbewerb: "Wettbewerb",
                baubeginn: "Baubeginn",
                bauende: "Bauende",
                bauzeit_monate: "Bauzeit (Monate)",
            };
            timeline.forEach(ms => {
                const field = document.createElement("div");
                field.className = "detail-field";
                const lbl = document.createElement("div");
                lbl.className = "label";
                lbl.textContent = milestoneLabels[ms.milestone] || ms.milestone;
                field.appendChild(lbl);
                const val = document.createElement("div");
                val.className = "value";
                val.textContent = ms.value;
                field.appendChild(val);
                tlDiv.appendChild(field);
            });
            container.appendChild(this.wrapCard("Termine", tlDiv));
        }

        // Description
        if (project.project_description) {
            const descDiv = document.createElement("div");
            descDiv.className = "description-text";
            descDiv.textContent = project.project_description;
            container.appendChild(this.wrapCard("Projektbeschrieb", descDiv));
        }

        // PDF link
        const pdfLink = document.createElement("a");
        pdfLink.className = "pdf-link";
        pdfLink.href = `docs/bautendokumentationen/${project.pdf_filename}`;
        pdfLink.target = "_blank";
        pdfLink.innerHTML = "\uD83D\uDCC4 PDF Bautendokumentation oeffnen";
        container.appendChild(pdfLink);
    },

    wrapCard(title, content) {
        const card = document.createElement("div");
        card.className = "card mb-16";
        const header = document.createElement("div");
        header.className = "card-header";
        header.textContent = title;
        card.appendChild(header);
        const body = document.createElement("div");
        body.className = "card-body";
        body.appendChild(content);
        card.appendChild(body);
        return card;
    },
};
