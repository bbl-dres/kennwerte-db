/**
 * db.js — SQL query wrapper for kennwerte-db
 */
class KennwerteDB {
    constructor(sqlDb) {
        this.db = sqlDb;
    }

    query(sql, params) {
        const stmt = this.db.prepare(sql);
        if (params) stmt.bind(params);
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    }

    queryOne(sql, params) {
        const results = this.query(sql, params);
        return results.length > 0 ? results[0] : null;
    }

    getProjects() {
        return this.query(`
            SELECT b.*,
                   c.display_name_de as category_label,
                   ROUND(b.construction_cost_total / NULLIF(b.gf_m2, 0)) as chf_per_m2_gf,
                   e.images_found
            FROM bauprojekt b
            LEFT JOIN ref_category_map c ON c.folder_name = b.category
            LEFT JOIN extraction_log e ON e.bauprojekt_id = b.id
            ORDER BY b.completion_year DESC, b.project_name
        `);
    }

    getProject(id) {
        return this.queryOne(
            `SELECT b.*, c.display_name_de as category_label,
                    ROUND(b.construction_cost_total / NULLIF(b.gf_m2, 0)) as chf_per_m2_gf,
                    e.images_found,
                    e.quality_grade
             FROM bauprojekt b
             LEFT JOIN ref_category_map c ON c.folder_name = b.category
             LEFT JOIN extraction_log e ON e.bauprojekt_id = b.id
             WHERE b.id = $id`,
            { $id: id }
        );
    }

    getCostRecords(projectId) {
        return this.query(
            "SELECT * FROM cost_record WHERE bauprojekt_id = $id ORDER BY CAST(bkp_code AS INTEGER)",
            { $id: projectId }
        );
    }

    getBenchmarks(projectId) {
        return this.query(
            "SELECT * FROM benchmark_extracted WHERE bauprojekt_id = $id",
            { $id: projectId }
        );
    }

    getIndexReference(projectId) {
        return this.queryOne(
            "SELECT * FROM index_reference WHERE bauprojekt_id = $id",
            { $id: projectId }
        );
    }

    getTimeline(projectId) {
        return this.query(
            "SELECT * FROM project_timeline WHERE bauprojekt_id = $id",
            { $id: projectId }
        );
    }

    /**
     * Probe actual image files for a project by trying to HEAD-fetch them.
     * Returns Promise<string[]> — array of verified image paths.
     * First image doubles as the thumbnail (no separate thumbnails folder).
     * Tries .jpeg first, then .png for each slot.
     */
    async getProjectImages(projectId, imagesFound) {
        const count = imagesFound || 0;
        if (count === 0) return [];

        const dir = `assets/images/projects/${projectId}`;
        const probes = [];
        for (let i = 1; i <= count; i++) {
            const num = String(i).padStart(3, '0');
            probes.push(
                fetch(`${dir}/${num}.jpeg`, { method: 'HEAD' })
                    .then(r => r.ok ? `${dir}/${num}.jpeg` : null)
                    .catch(() => null)
                    .then(jpeg => jpeg || fetch(`${dir}/${num}.png`, { method: 'HEAD' })
                        .then(r => r.ok ? `${dir}/${num}.png` : null)
                        .catch(() => null))
            );
        }
        const results = await Promise.all(probes);
        return results.filter(Boolean);
    }

    getFilterOptions() {
        return {
            dataSources: this.query(
                "SELECT code as value, name_de as label FROM ref_data_source ORDER BY name_de"
            ),
            categories: this.query(
                "SELECT folder_name as value, display_name_de as label FROM ref_category_map ORDER BY display_name_de"
            ),
            cantons: this.query(
                "SELECT DISTINCT canton as value, canton as label FROM bauprojekt WHERE canton IS NOT NULL ORDER BY canton"
            ),
            arbeitenTypes: this.query(
                "SELECT DISTINCT arbeiten_type as value, arbeiten_type as label FROM bauprojekt WHERE arbeiten_type IS NOT NULL ORDER BY arbeiten_type"
            ),
            yearRange: this.queryOne(
                "SELECT MIN(completion_year) as min_year, MAX(completion_year) as max_year FROM bauprojekt WHERE completion_year IS NOT NULL"
            ),
        };
    }

}

window.KennwerteDB = KennwerteDB;
