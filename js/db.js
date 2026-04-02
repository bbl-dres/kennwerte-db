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

    getProjects(filters) {
        let where = [];
        let params = {};

        if (filters.data_source) {
            where.push("b.data_source = $data_source");
            params.$data_source = filters.data_source;
        }
        if (filters.category) {
            where.push("b.category = $category");
            params.$category = filters.category;
        }
        if (filters.canton) {
            where.push("b.canton = $canton");
            params.$canton = filters.canton;
        }
        if (filters.arbeiten_type) {
            where.push("b.arbeiten_type = $arbeiten_type");
            params.$arbeiten_type = filters.arbeiten_type;
        }
        if (filters.yearFrom) {
            where.push("b.completion_year >= $yearFrom");
            params.$yearFrom = parseInt(filters.yearFrom);
        }
        if (filters.yearTo) {
            where.push("b.completion_year <= $yearTo");
            params.$yearTo = parseInt(filters.yearTo);
        }
        if (filters.search) {
            where.push("(b.project_name LIKE $search OR b.municipality LIKE $search OR b.architect LIKE $search)");
            params.$search = `%${filters.search}%`;
        }

        const whereClause = where.length > 0 ? "WHERE " + where.join(" AND ") : "";

        const sql = `
            SELECT b.*,
                   c.display_name_de as category_label,
                   ROUND(b.construction_cost_total / NULLIF(b.gf_m2, 0)) as chf_per_m2_gf
            FROM bauprojekt b
            LEFT JOIN ref_category_map c ON c.folder_name = b.category
            ${whereClause}
            ORDER BY b.completion_year DESC, b.project_name
        `;

        return this.query(sql, Object.keys(params).length > 0 ? params : undefined);
    }

    getProject(id) {
        return this.queryOne(
            `SELECT b.*, c.display_name_de as category_label,
                    ROUND(b.construction_cost_total / NULLIF(b.gf_m2, 0)) as chf_per_m2_gf
             FROM bauprojekt b
             LEFT JOIN ref_category_map c ON c.folder_name = b.category
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

    getStatistics(filters) {
        const projects = this.getProjects(filters || {});
        const withCost = projects.filter(p => p.chf_per_m2_gf != null);
        const withGF = projects.filter(p => p.gf_m2 != null);

        const values = withCost.map(p => p.chf_per_m2_gf).sort((a, b) => a - b);

        const percentile = (arr, p) => {
            if (arr.length === 0) return null;
            const idx = (p / 100) * (arr.length - 1);
            const lo = Math.floor(idx);
            const hi = Math.ceil(idx);
            if (lo === hi) return arr[lo];
            return arr[lo] + (arr[hi] - arr[lo]) * (idx - lo);
        };

        return {
            totalProjects: projects.length,
            withCostData: withCost.length,
            withGF: withGF.length,
            chfPerM2: {
                min: values.length > 0 ? values[0] : null,
                p25: percentile(values, 25),
                median: percentile(values, 50),
                p75: percentile(values, 75),
                max: values.length > 0 ? values[values.length - 1] : null,
                mean: values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null,
            },
        };
    }

    getCategoryStats() {
        return this.query(`
            SELECT b.category,
                   c.display_name_de as category_label,
                   COUNT(*) as total,
                   SUM(CASE WHEN b.gf_m2 IS NOT NULL AND b.construction_cost_total IS NOT NULL THEN 1 ELSE 0 END) as with_benchmarks,
                   ROUND(AVG(CASE WHEN b.gf_m2 > 0 THEN b.construction_cost_total / b.gf_m2 END)) as avg_chf_m2,
                   ROUND(MIN(CASE WHEN b.gf_m2 > 0 THEN b.construction_cost_total / b.gf_m2 END)) as min_chf_m2,
                   ROUND(MAX(CASE WHEN b.gf_m2 > 0 THEN b.construction_cost_total / b.gf_m2 END)) as max_chf_m2
            FROM bauprojekt b
            LEFT JOIN ref_category_map c ON c.folder_name = b.category
            GROUP BY b.category
            ORDER BY total DESC
        `);
    }
}

window.KennwerteDB = KennwerteDB;
