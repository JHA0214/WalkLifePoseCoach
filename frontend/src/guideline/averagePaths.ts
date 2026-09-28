import type { PathPoint } from "./types";

const RESAMPLE_COUNT = 50;

// 경로를 시작~끝 구간을 0~1로 놓고 균일한 개수의 지점으로 리샘플링한다.
// 녹화마다 길이(포인트 수)와 소요 시간이 달라도 같은 기준으로 비교/평균할 수 있게 하기 위함.
function resamplePath(path: PathPoint[], count: number): PathPoint[] {
  const startT = path[0].t;
  const duration = path[path.length - 1].t - startT || 1;

  const result: PathPoint[] = [];
  let cursor = 0;
  for (let i = 0; i < count; i++) {
    const targetT = startT + (duration * i) / (count - 1);
    while (cursor < path.length - 2 && path[cursor + 1].t < targetT) cursor++;
    const a = path[cursor];
    const b = path[Math.min(cursor + 1, path.length - 1)];
    const span = b.t - a.t || 1;
    const ratio = Math.min(Math.max((targetT - a.t) / span, 0), 1);
    result.push({
      t: targetT - startT,
      x: a.x + (b.x - a.x) * ratio,
      y: a.y + (b.y - a.y) * ratio,
    });
  }
  return result;
}

// 같은 동작을 여러 번 녹화한 경로들을 리샘플링한 뒤 지점별로 평균 내어 하나의 대표 동선을 만든다.
export function averagePaths(paths: PathPoint[][]): PathPoint[] {
  const usable = paths.filter((p) => p.length >= 2);
  if (usable.length === 0) return [];

  const resampled = usable.map((p) => resamplePath(p, RESAMPLE_COUNT));
  const avgDuration =
    resampled.reduce((sum, p) => sum + p[p.length - 1].t, 0) / resampled.length;

  const result: PathPoint[] = [];
  for (let i = 0; i < RESAMPLE_COUNT; i++) {
    let sx = 0;
    let sy = 0;
    for (const p of resampled) {
      sx += p[i].x;
      sy += p[i].y;
    }
    result.push({
      t: (avgDuration * i) / (RESAMPLE_COUNT - 1),
      x: sx / resampled.length,
      y: sy / resampled.length,
    });
  }
  return result;
}
