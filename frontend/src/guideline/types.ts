export type TargetJoint = "left_wrist" | "right_wrist" | "left_ankle" | "right_ankle";

export interface PathPoint {
  t: number;
  x: number;
  y: number;
}

export interface Guideline {
  id: string;
  name: string;
  targetJoint: TargetJoint;
  tolerance: number;
  path: PathPoint[];
  createdAt: string;
}

export interface GuidelineDraft {
  name: string;
  targetJoint: TargetJoint;
  tolerance: number;
  path: PathPoint[];
}
