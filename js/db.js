/**
 * db.js — SQL query wrapper for kennwerte-db
 */
class KennwerteDB {
    constructor(sqlDb) {
        this.db = sqlDb;
    }

    query(sql, params) {
        const stmt = this.db.prepare(sql);
        try {
            if (params) stmt.bind(params);
            const results = [];
            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }
            return results;
        } finally {
            stmt.free();
        }
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
                   ROUND(b.construction_cost_total / NULLIF(b.gv_m3, 0)) as chf_per_m3_gv,
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
                   ROUND(b.construction_cost_total / NULLIF(b.gv_m3, 0)) as chf_per_m3_gv,
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
        const all = this.query(
            "SELECT * FROM cost_record WHERE bauprojekt_id = $id",
            { $id: projectId }
        );
        // Split by code pattern: numeric = BKP, letter = eBKP-H
        const bkp = all.filter(c => /^\d/.test(c.bkp_code)).sort((a, b) => parseInt(a.bkp_code) - parseInt(b.bkp_code));
        const ebkph = all.filter(c => /^[A-Z]/i.test(c.bkp_code)).sort((a, b) => a.bkp_code.localeCompare(b.bkp_code));
        return { bkp, ebkph };
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
     * Build image paths for a project based on filesystem convention.
     * Returns string[] — assumes .jpeg extension; onerror in UI handles .png fallback.
     * No network probing — images are verified lazily when they render.
     */
    getProjectImages(projectId, imagesFound) {
        const count = imagesFound || 0;
        if (count === 0) return [];
        const dir = `assets/images/projects/${projectId}`;
        const images = [];
        for (let i = 1; i <= count; i++) {
            images.push(`${dir}/${String(i).padStart(3, '0')}.jpeg`);
        }
        return images;
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
            ).map(r => ({ value: r.value, label: ART_LABELS[r.value] || r.value })),
            countries: this.query(
                "SELECT DISTINCT country as value, country as label FROM bauprojekt WHERE country IS NOT NULL ORDER BY country"
            ),
            qualityGrades: QUALITY_GRADES.map(g => ({ value: g, label: QUALITY_LABELS[g] })),
            yearRange: this.queryOne(
                "SELECT MIN(completion_year) as min_year, MAX(completion_year) as max_year FROM bauprojekt WHERE completion_year IS NOT NULL"
            ),
        };
    }

}

window.KennwerteDB = KennwerteDB;
