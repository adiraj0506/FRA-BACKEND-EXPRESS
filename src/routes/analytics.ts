import { Router } from "express";
import { pool } from "../db/pool";

const router = Router();

// GET /api/analytics
router.get("/", async (_req, res) => {
  try {
    // 1. Total claims
    const totalClaims = await pool.query("SELECT COUNT(*) FROM claims;");

    // 2. Claims grouped by status
    const byStatus = await pool.query(`
      SELECT status, COUNT(*) 
      FROM claims 
      GROUP BY status;
    `);

    // 3. Claims per village
    const byVillage = await pool.query(`
      SELECT village_id, COUNT(*) 
      FROM claims 
      GROUP BY village_id;
    `);

    // 4. Geographic analytics
    const geo = await pool.query(`
      SELECT 
        ROUND(SUM(ST_Area(geom::geography)) / 1000000, 2) AS total_area_km2,
        ROUND(AVG(ST_Area(geom::geography)) / 1000000, 2) AS avg_area_km2,
        ROUND(MAX(ST_Area(geom::geography)) / 1000000, 2) AS max_area_km2,
        ROUND(MIN(ST_Area(geom::geography)) / 1000000, 2) AS min_area_km2
      FROM claims;
    `);

    res.json({
      total: parseInt(totalClaims.rows[0].count, 10),
      byStatus: byStatus.rows,
      byVillage: byVillage.rows,
      geography: geo.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
