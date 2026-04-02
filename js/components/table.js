/**
 * table.js — Reusable sortable table component
 */
window.TableComponent = {
    render(columns, rows, options) {
        options = options || {};
        const table = document.createElement("table");
        table.className = "data-table";

        // Thead
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");

        columns.forEach(col => {
            const th = document.createElement("th");
            th.textContent = col.label;
            if (col.align === "right") th.classList.add("num");
            if (col.sortKey) {
                th.addEventListener("click", () => {
                    if (options.onSort) options.onSort(col.sortKey);
                });
            }
            if (options.sortKey === col.sortKey) {
                th.classList.add("sorted");
                const arrow = document.createElement("span");
                arrow.className = "sort-arrow";
                arrow.textContent = options.sortDir === "asc" ? " \u25B2" : " \u25BC";
                th.appendChild(arrow);
            }
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Tbody
        const tbody = document.createElement("tbody");

        if (rows.length === 0) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = columns.length;
            td.style.textAlign = "center";
            td.style.padding = "32px";
            td.style.color = "var(--color-text-secondary)";
            td.textContent = "Keine Projekte gefunden";
            tr.appendChild(td);
            tbody.appendChild(tr);
        }

        rows.forEach(row => {
            const tr = document.createElement("tr");
            if (options.onRowClick) {
                tr.addEventListener("click", () => options.onRowClick(row));
            }

            columns.forEach(col => {
                const td = document.createElement("td");
                if (col.align === "right") td.classList.add("num");

                if (col.render) {
                    const content = col.render(row);
                    if (typeof content === "string") {
                        td.innerHTML = content;
                    } else if (content instanceof HTMLElement) {
                        td.appendChild(content);
                    }
                } else {
                    const val = row[col.key];
                    td.textContent = val != null ? val : "\u2014";
                }

                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        return table;
    },

    formatCHF(value) {
        if (value == null) return "\u2014";
        return new Intl.NumberFormat("de-CH").format(Math.round(value));
    },

    formatArea(value) {
        if (value == null) return "\u2014";
        return new Intl.NumberFormat("de-CH").format(Math.round(value));
    },
};
