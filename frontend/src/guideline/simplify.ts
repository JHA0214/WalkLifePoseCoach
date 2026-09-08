import type { PathPoint } from "./types";

const TARGET_POINTS = 40;

// 프레임마다 기록된 원본 경로는 손떨림/검출 노이즈로 지그재그가 생겨 지저분해 보인다.
// 이동평균으로 떨림을 줄이고, 균일한 간격으로 다운샘플링해 매끄러운 경로로 정리한다.
export function simplifyPath(path: PathPoint[], targetPoints = TARGET_POINTS): PathPoint[] {
  if (path.length <= targetPoints) return path;

  const windowSize = Math.max(1, Math.floor(path.length / targetPoints / 2));
  const smoothed = path.map((p, i) => {
    const start = Math.max(0, i - windowSize);
    const end = Math.min(path.length - 1, i + windowSize);
    let sx = 0;
    let sy = 0;
    for (let j = start; j <= end; j++) {
      sx += path[j].x;
      sy += path[j].y;
    }
    const n = end - start + 1;
    return { t: p.t, x: sx / n, y: sy / n };
  });

  const step = (smoothed.length - 1) / (targetPoints - 1);
  const result: PathPoint[] = [];
  for (let i = 0; i < targetPoints; i++) {
    result.push(smoothed[Math.round(i * step)]);
  }
  return result;
}
