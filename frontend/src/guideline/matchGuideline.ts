import type { Point } from "./normalize";
import type { PathPoint } from "./types";

export function distanceToPath(point: Point, path: PathPoint[]): number {
  let min = Infinity;
  for (const p of path) {
    const dx = point.x - p.x;
    const dy = point.y - p.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < min) min = d;
  }
  return min;
}

export function isInsideGuideline(point: Point, path: PathPoint[], tolerance: number): boolean {
  return distanceToPath(point, path) <= tolerance;
}
