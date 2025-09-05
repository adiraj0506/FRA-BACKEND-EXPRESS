import { Router } from "express";
import { pool } from "../db/pool";

const router = Router();

// POST /api/claims
router.post("/", async (req, res) => {
  const { claimant_name, village_id, geom } = req.body;

  if (!claimant_name || !village_id || !geom) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 1. Check for overlaps
    const conflictCheck = await pool.query(
      `
      SELECT id, claimant_name
      FROM claims
      WHERE ST_Intersects(
        geom,
        ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)
      );
      `,
      [JSON.stringify(geom)]
    );

    if (conflictCheck.rows.length > 0) {
      return res.status(409).json({
        message: "Conflict detected with existing claims",
        conflicts: conflictCheck.rows,
      });
    }

    // 2. Insert new claim
    const insertQuery = await pool.query(
      `
      INSERT INTO claims (id, village_id, claimant_name, status, created_at, geom)
      VALUES (gen_random_uuid(), $1, $2, 'PENDING', NOW(), ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))
      RETURNING *;
      `,
      [village_id, claimant_name, JSON.stringify(geom)]
    );

    res.status(201).json({
      message: "Claim inserted successfully",
      claim: insertQuery.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /api/claims → fetch all claims
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM claims;");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
