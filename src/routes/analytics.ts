import { Router } from "express";
import { pool } from "../db/pool";

const router = Router();

// GET /api/analytics
router.get("/", async (_req, res) => {
  try {
    // 1. Total claims
    const totalClaims = await pool.query(`SELECT COUNT(*) FROM claims;`);

    // 2. Claims by status
    const byStatus = await pool.query(
      `SELECT status, COUNT(*) 
       FROM claims 
       GROUP BY status;`
    );

    // 3. Claims by village
    const byVillage = await pool.query(
      `SELECT village_id, COUNT(*) 
       FROM claims 
       GROUP BY village_id;`
    );

    // 4. Total area (in hectares) & average claim size
    const areaStats = await pool.query(
      `SELECT 
         SUM(ST_Area(geom::geography) / 10000) AS total_area_ha,
         AVG(ST_Area(geom::geography) / 10000) AS avg_area_ha
       FROM claims;`
    );

    // 5. Conflicting claims count
    const conflicts = await pool.query(
      `SELECT COUNT(*) AS conflict_count
       FROM claims c1
       WHERE EXISTS (
         SELECT 1 FROM claims c2
         WHERE c1.claim_id <> c2.claim_id
         AND ST_Intersects(c1.geom, c2.geom)
       );`
    );

    res.json({
      totalClaims: parseInt(totalClaims.rows[0].count, 10),
      byStatus: byStatus.rows,
      byVillage: byVillage.rows,
      totalAreaHa: parseFloat(areaStats.rows[0].total_area_ha) || 0,
      avgAreaHa: parseFloat(areaStats.rows[0].avg_area_ha) || 0,
      conflictCount: parseInt(conflicts.rows[0].conflict_count, 10)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
