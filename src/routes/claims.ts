import { Router } from "express";
import { pool } from "../db/pool";

const router = Router();

// POST /api/claims
router.post("/", async (req, res) => {
  const { claimant_name, village_id, geom } = req.body;

  try {
    // 1. Check overlap with existing claims
    const conflict = await pool.query(
      `SELECT claim_id 
       FROM claims 
       WHERE ST_Intersects(geom, ST_GeomFromGeoJSON($1));`,
      [JSON.stringify(geom)]
    );

    if (conflict.rows.length > 0) {
      return res.status(400).json({
        error: "Claim overlaps with an existing claim",
        conflictingClaims: conflict.rows.map((r) => r.claim_id)
      });
    }

    // 2. Check overlap with forest boundaries
    const forestConflict = await pool.query(
      `SELECT id, name 
       FROM forests 
       WHERE ST_Intersects(geom, ST_GeomFromGeoJSON($1));`,
      [JSON.stringify(geom)]
    );

    if (forestConflict.rows.length > 0) {
      return res.status(400).json({
        error: "Claim overlaps with a protected forest area",
        forests: forestConflict.rows
      });
    }

    // 3. Insert if no conflict
    const result = await pool.query(
      `INSERT INTO claims (claimant_name, village_id, geom, status)
       VALUES ($1, $2, ST_GeomFromGeoJSON($3), 'PENDING')
       RETURNING *;`,
      [claimant_name, village_id, JSON.stringify(geom)]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
