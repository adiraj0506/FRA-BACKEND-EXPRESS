import { Router } from "express";
import { pool } from "../db/pool";

const router = Router();

// GET /api/claims - List all claims
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.claimant_name, c.village_id, c.status, c.created_at,
             v.name as village_name,
             ST_AsGeoJSON(c.geom) as geometry
      FROM claims c
      LEFT JOIN villages v ON c.village_id = v.id
      ORDER BY c.created_at DESC;
    `);
    
    res.json({
      success: true,
      count: result.rows.length,
      claims: result.rows
    });
  } catch (err) {
    console.error("Get claims error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /api/claims
router.post("/", async (req, res) => {
  const { claimant_name, village_id, geom } = req.body;

  // Input validation
  if (!claimant_name || !village_id || !geom) {
    return res.status(400).json({
      error: "Missing required fields: claimant_name, village_id, and geom are required"
    });
  }

  // Validate GeoJSON structure
  if (!geom.type || !geom.coordinates) {
    return res.status(400).json({
      error: "Invalid geometry: geom must have 'type' and 'coordinates' properties"
    });
  }

  // Validate coordinates array structure
  if (!Array.isArray(geom.coordinates)) {
    return res.status(400).json({
      error: "Invalid geometry: coordinates must be an array"
    });
  }

  // For Polygon type, validate the ring structure
  if (geom.type === 'Polygon') {
    if (!Array.isArray(geom.coordinates[0]) || !Array.isArray(geom.coordinates[0][0])) {
      return res.status(400).json({
        error: "Invalid Polygon: coordinates must be an array of rings, where each ring is an array of coordinate pairs"
      });
    }
  }

  // Set timeout for the request
  let timeoutId: NodeJS.Timeout | null = null;
  let responseSent = false;
  
  const sendResponse = (statusCode: number, data: any) => {
    if (!responseSent) {
      responseSent = true;
      if (timeoutId) clearTimeout(timeoutId);
      res.status(statusCode).json(data);
    }
  };
  
  timeoutId = setTimeout(() => {
    sendResponse(408, { error: "Request timeout" });
  }, 15000); // 15 second timeout

  try {
    // 1. Check overlap with existing claims
    const conflict = await pool.query(
      `SELECT id 
       FROM claims 
       WHERE ST_Intersects(geom, ST_GeomFromGeoJSON($1));`,
      [JSON.stringify(geom)]
    );

    if (conflict.rows.length > 0) {
      return sendResponse(400, {
        error: "Claim overlaps with an existing claim",
        conflictingClaims: conflict.rows.map((r) => r.id)
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
      return sendResponse(400, {
        error: "Claim overlaps with a protected forest area",
        forests: forestConflict.rows
      });
    }

    // 3. Insert if no conflict
    const result = await pool.query(
      `INSERT INTO claims (claimant_name, village_id, geom, status)
       VALUES ($1, $2, ST_GeomFromGeoJSON($3), 'pending')
       RETURNING *;`,
      [claimant_name, village_id, JSON.stringify(geom)]
    );

    sendResponse(201, result.rows[0]);
  } catch (err) {
    console.error("Claims error:", err);
    
    // Handle specific database errors
    if (err instanceof Error) {
      if (err.message.includes('timeout')) {
        return sendResponse(408, { error: "Database query timeout" });
      }
      if (err.message.includes('connection')) {
        return sendResponse(503, { error: "Database connection error" });
      }
      if (err.message.includes('coordinates')) {
        return sendResponse(400, { error: "Invalid geometry coordinates format" });
      }
    }
    
    sendResponse(500, { error: "Internal server error" });
  }
});

export default router;
