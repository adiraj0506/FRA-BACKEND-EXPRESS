import { Router } from "express";
import { pool } from "../db/pool";

const router = Router();

// GET /api/claims -> fetch all claims
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM claims ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching claims:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/claims -> add a new claim
router.post("/", async (req, res) => {
  const { claimant_name, claim_amount, status } = req.body;

  if (!claimant_name || !claim_amount) {
    return res.status(400).json({ error: "claimant_name and claim_amount are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO claims (claimant_name, claim_amount, status) 
       VALUES ($1, $2, $3) RETURNING *`,
      [claimant_name, claim_amount, status || "pending"]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error inserting claim:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


export default router;
