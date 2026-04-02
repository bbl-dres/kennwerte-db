/**
 * project-list.js — Filterable project list view
 */
window.ProjectListView = {
    filters: {},
    sortKey: "completion_year",
    sortDir: "desc",

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

        // Main content
        const main = document.createElement("div");

        let projects = db.getProjects(this.filters);

        // Sort
        const sk = this.sortKey;
        const dir = this.sortDir === "asc" ? 1 : -1;
        projects.sort((a, b) => {
            let va = a[sk], vb = b[sk];
            if (va == null && vb == null) return 0;
            if (va == null) return 1;
            if (vb == null) return -1;
            if (typeof va === "string") return va.localeCompare(vb) * dir;
            return (va - vb) * dir;
        });

        // Count display
        const countDiv = document.createElement("div");
        countDiv.className = "text-sm text-muted mb-16";
        countDiv.textContent = `${projects.length} Projekte`;
        main.appendChild(countDiv);

        // Table
        const columns = [
            { key: "completion_year", label: "Jahr", sortKey: "completion_year", align: "right" },
            { key: "municipality", label: "Ort", sortKey: "municipality" },
            { key: "project_name", label: "Projekt", sortKey: "project_name",
                render: row => {
                    const span = document.createElement("span");
                    span.textContent = row.project_name;
                    span.style.fontWeight = "500";
                    return span;
                },
            },
            { key: "category_label", label: "Kategorie", sortKey: "category",
                render: row => `<span class="tag">${row.category_label || row.category}</span>`,
            },
            { key: "arbeiten_type", label: "Art", sortKey: "arbeiten_type",
                render: row => {
                    const type = row.arbeiten_type;
                    const label = FiltersComponent.formatArbeitenType(type);
                    let cls = "tag";
                    if (type === "NEUBAU") cls += " tag-neubau";
                    else if (type && type.includes("SANIERUNG")) cls += " tag-sanierung";
                    else if (type && type.includes("UMBAU")) cls += " tag-umbau";
                    return `<span class="${cls}">${label}</span>`;
                },
            },
            { key: "gf_m2", label: "GF m\u00B2", sortKey: "gf_m2", align: "right",
                render: row => TableComponent.formatArea(row.gf_m2),
            },
            { key: "construction_cost_total", label: "Kosten CHF", sortKey: "construction_cost_total", align: "right",
                render: row => TableComponent.formatCHF(row.construction_cost_total),
            },
            { key: "chf_per_m2_gf", label: "CHF/m\u00B2 GF", sortKey: "chf_per_m2_gf", align: "right",
                render: row => row.chf_per_m2_gf != null
                    ? `<strong>${TableComponent.formatCHF(row.chf_per_m2_gf)}</strong>`
                    : "\u2014",
            },
        ];

        const tableEl = document.createElement("div");
        tableEl.className = "card";
        tableEl.appendChild(TableComponent.render(columns, projects, {
            sortKey: this.sortKey,
            sortDir: this.sortDir,
            onSort: key => {
                if (this.sortKey === key) {
                    this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
                } else {
                    this.sortKey = key;
                    this.sortDir = key === "completion_year" ? "desc" : "asc";
                }
                this.update();
            },
            onRowClick: row => {
                window.location.hash = `#/project/${row.id}`;
            },
        }));
        main.appendChild(tableEl);

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
