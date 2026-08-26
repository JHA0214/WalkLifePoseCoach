import express from "express";
import cors from "cors";
import { guidelinesRouter } from "./routes/guidelines.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://jha0214.github.io",
];

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json({ limit: "5mb" }));

app.use("/api/guidelines", guidelinesRouter);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`WalkLifePoseCoach backend listening on http://localhost:${PORT}`);
});
