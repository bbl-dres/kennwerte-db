/**
 * app.js — Main application: init sql.js, routing, view orchestration
 */
(async function () {
    const content = document.getElementById("content");

    // Initialize sql.js
    let db;
    try {
        const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
        });

        const response = await fetch("data/kennwerte.db");
        if (!response.ok) throw new Error(`Failed to load database: ${response.status}`);
        const buffer = await response.arrayBuffer();
        const sqlDb = new SQL.Database(new Uint8Array(buffer));
        db = new KennwerteDB(sqlDb);
    } catch (err) {
        content.innerHTML = `
            <div class="empty-state">
                <h3>Fehler beim Laden der Datenbank</h3>
                <p>${err.message}</p>
                <p class="text-sm text-muted mt-16">Stellen Sie sicher, dass die Datei <code>data/kennwerte.db</code> vorhanden ist und die Seite ueber einen HTTP-Server geladen wird.</p>
            </div>
        `;
        return;
    }

    // Router
    function route() {
        const hash = window.location.hash || "#/projects";
        const parts = hash.replace("#/", "").split("/");
        const view = parts[0];
        const param = parts[1];

        // Update nav
        document.querySelectorAll(".nav-link").forEach(link => {
            link.classList.toggle("active", link.getAttribute("data-view") === view);
        });

        // Render view
        content.innerHTML = "";
        switch (view) {
            case "project":
                ProjectDetailView.render(db, content, parseInt(param));
                break;
            case "statistics":
                StatisticsView.render(db, content);
                break;
            case "projects":
            default:
                ProjectListView.render(db, content);
                break;
        }

        // Scroll to top
        window.scrollTo(0, 0);
    }

    window.addEventListener("hashchange", route);
    route();
})();
