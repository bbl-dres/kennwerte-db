/**
 * filters.js — Filter panel component
 */
window.FiltersComponent = {
    render(options, currentFilters, onChange) {
        const panel = document.createElement("aside");
        panel.className = "card filter-panel";

        const header = document.createElement("div");
        header.className = "card-header";
        header.textContent = "Filter";
        panel.appendChild(header);

        const body = document.createElement("div");
        body.className = "card-body";

        // Search
        body.appendChild(this.createInput("search", "Suche", "text", currentFilters.search, "Projekt, Ort, Architekt...", onChange));

        // Data source
        body.appendChild(this.createSelect("data_source", "Datenquelle", options.dataSources, currentFilters.data_source, onChange));

        // Category
        body.appendChild(this.createSelect("category", "Kategorie", options.categories, currentFilters.category, onChange));

        // Canton
        body.appendChild(this.createSelect("canton", "Kanton", options.cantons, currentFilters.canton, onChange));

        // Art der Arbeiten
        const arbeitenOptions = (options.arbeitenTypes || []).map(a => ({
            value: a.value,
            label: this.formatArbeitenType(a.value),
        }));
        body.appendChild(this.createSelect("arbeiten_type", "Art der Arbeiten", arbeitenOptions, currentFilters.arbeiten_type, onChange));

        // Year range
        const yearGroup = document.createElement("div");
        yearGroup.className = "filter-group";
        const yearLabel = document.createElement("label");
        yearLabel.textContent = "Zeitraum";
        yearGroup.appendChild(yearLabel);

        const yearRow = document.createElement("div");
        yearRow.style.display = "flex";
        yearRow.style.gap = "8px";

        const fromInput = document.createElement("input");
        fromInput.type = "number";
        fromInput.placeholder = options.yearRange ? options.yearRange.min_year : "Von";
        fromInput.value = currentFilters.yearFrom || "";
        fromInput.addEventListener("change", () => onChange("yearFrom", fromInput.value || null));

        const toInput = document.createElement("input");
        toInput.type = "number";
        toInput.placeholder = options.yearRange ? options.yearRange.max_year : "Bis";
        toInput.value = currentFilters.yearTo || "";
        toInput.addEventListener("change", () => onChange("yearTo", toInput.value || null));

        yearRow.appendChild(fromInput);
        yearRow.appendChild(toInput);
        yearGroup.appendChild(yearRow);
        body.appendChild(yearGroup);

        // Reset button
        const resetBtn = document.createElement("button");
        resetBtn.className = "filter-reset";
        resetBtn.textContent = "Filter zuruecksetzen";
        resetBtn.addEventListener("click", () => onChange("reset"));
        body.appendChild(resetBtn);

        panel.appendChild(body);
        return panel;
    },

    createSelect(name, label, options, currentValue, onChange) {
        const group = document.createElement("div");
        group.className = "filter-group";

        const lbl = document.createElement("label");
        lbl.textContent = label;
        group.appendChild(lbl);

        const select = document.createElement("select");
        const defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.textContent = "Alle";
        select.appendChild(defaultOpt);

        (options || []).forEach(opt => {
            const option = document.createElement("option");
            option.value = opt.value;
            option.textContent = opt.label;
            if (opt.value === currentValue) option.selected = true;
            select.appendChild(option);
        });

        select.addEventListener("change", () => onChange(name, select.value || null));
        group.appendChild(select);
        return group;
    },

    createInput(name, label, type, currentValue, placeholder, onChange) {
        const group = document.createElement("div");
        group.className = "filter-group";

        const lbl = document.createElement("label");
        lbl.textContent = label;
        group.appendChild(lbl);

        const input = document.createElement("input");
        input.type = type;
        input.placeholder = placeholder || "";
        input.value = currentValue || "";

        let timer;
        input.addEventListener("input", () => {
            clearTimeout(timer);
            timer = setTimeout(() => onChange(name, input.value || null), 300);
        });

        group.appendChild(input);
        return group;
    },

    formatArbeitenType(type) {
        const map = {
            "NEUBAU": "Neubau",
            "UMBAU": "Umbau",
            "UMBAU_SANIERUNG": "Sanierung",
            "UMBAU_ERWEITERUNG": "Erweiterung",
            "UMBAU_TEILABBRUCH": "Teilabbruch",
            "ABBRUCH": "Abbruch",
        };
        return map[type] || type;
    },
};
