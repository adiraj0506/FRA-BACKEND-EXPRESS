import { Router } from "express";
import { pool } from "../db/pool";

const router = Router();

// GET /api/analytics
router.get("/", async (_req, res) => {
  // Set timeout for the request
  const timeoutId = setTimeout(() => {
    res.status(408).json({ error: "Request timeout" });
  }, 20000); // 20 second timeout for analytics (more complex queries)

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
         COALESCE(SUM(ST_Area(geom::geography) / 10000), 0) AS total_area_ha,
         COALESCE(AVG(ST_Area(geom::geography) / 10000), 0) AS avg_area_ha
       FROM claims;`
    );

    // 5. Conflicting claims count (use id instead of claim_id)
    const conflicts = await pool.query(
      `SELECT COUNT(*) AS conflict_count
       FROM claims c1
       WHERE EXISTS (
         SELECT 1 FROM claims c2
         WHERE c1.id <> c2.id
         AND ST_Intersects(c1.geom, c2.geom)
       );`
    );

    clearTimeout(timeoutId);
    res.json({
      totalClaims: parseInt(totalClaims.rows[0].count, 10),
      byStatus: byStatus.rows,
      byVillage: byVillage.rows,
      totalAreaHa: parseFloat(areaStats.rows[0].total_area_ha),
      avgAreaHa: parseFloat(areaStats.rows[0].avg_area_ha),
      conflictCount: parseInt(conflicts.rows[0].conflict_count, 10)
    });
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("Analytics error:", err);
    
    // Handle specific database errors
    if (err instanceof Error) {
      if (err.message.includes('timeout')) {
        return res.status(408).json({ error: "Database query timeout" });
      }
      if (err.message.includes('connection')) {
        return res.status(503).json({ error: "Database connection error" });
      }
    }
    
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
