import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import claimsRouter from "./routes/claims";

const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/claims", claimsRouter);

// Root endpoint
app.get("/", (req, res) => {
  res.send("✅ FRA Backend server is running...");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
