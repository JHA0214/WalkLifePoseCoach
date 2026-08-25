import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";

const TARGET_JOINTS = ["left_wrist", "right_wrist", "left_ankle", "right_ankle"] as const;

interface GuidelineRow {
  id: string;
  name: string;
  target_joint: string;
  tolerance: number;
  path_json: string;
  created_at: string;
}

function rowToGuideline(row: GuidelineRow) {
  return {
    id: row.id,
    name: row.name,
    targetJoint: row.target_joint,
    tolerance: row.tolerance,
    path: JSON.parse(row.path_json),
    createdAt: row.created_at,
  };
}

export const guidelinesRouter = Router();

guidelinesRouter.get("/", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM guidelines ORDER BY created_at DESC")
    .all() as GuidelineRow[];
  res.json(rows.map(rowToGuideline));
});

guidelinesRouter.get("/:id", (req, res) => {
  const row = db
    .prepare("SELECT * FROM guidelines WHERE id = ?")
    .get(req.params.id) as GuidelineRow | undefined;
  if (!row) {
    res.status(404).json({ error: "guideline not found" });
    return;
  }
  res.json(rowToGuideline(row));
});

guidelinesRouter.post("/", (req, res) => {
  const { name, targetJoint, tolerance, path } = req.body ?? {};

  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (!TARGET_JOINTS.includes(targetJoint)) {
    res.status(400).json({ error: `targetJoint must be one of ${TARGET_JOINTS.join(", ")}` });
    return;
  }
  if (typeof tolerance !== "number" || tolerance <= 0) {
    res.status(400).json({ error: "tolerance must be a positive number" });
    return;
  }
  if (!Array.isArray(path) || path.length < 2) {
    res.status(400).json({ error: "path must contain at least 2 points" });
    return;
  }

  const guideline = {
    id: randomUUID(),
    name: name.trim(),
    targetJoint,
    tolerance,
    path,
    createdAt: new Date().toISOString(),
  };

  db.prepare(
    `INSERT INTO guidelines (id, name, target_joint, tolerance, path_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    guideline.id,
    guideline.name,
    guideline.targetJoint,
    guideline.tolerance,
    JSON.stringify(guideline.path),
    guideline.createdAt
  );

  res.status(201).json(guideline);
});

guidelinesRouter.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM guidelines WHERE id = ?").run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "guideline not found" });
    return;
  }
  res.status(204).send();
});
