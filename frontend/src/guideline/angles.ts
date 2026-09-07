import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { Point } from "./normalize";

const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_ELBOW = 13;
const RIGHT_ELBOW = 14;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_KNEE = 25;
const RIGHT_KNEE = 26;

export interface JointAngle {
  vertex: Point;
  degrees: number;
}

// vertex를 꼭짓점으로 a, b 방향 벡터 사이의 각도(0~180도)
function angleBetween(vertex: Point, a: Point, b: Point): number {
  const v1 = { x: a.x - vertex.x, y: a.y - vertex.y };
  const v2 = { x: b.x - vertex.x, y: b.y - vertex.y };
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);
  if (mag1 < 1e-6 || mag2 < 1e-6) return 0;
  const cos = Math.min(1, Math.max(-1, (v1.x * v2.x + v1.y * v2.y) / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

// 팔: 어깨 관절 기준 위팔(팔꿈치 방향)과 몸통(엉덩이 방향) 사이 각도
// 다리: 엉덩이 관절 기준 허벅지(무릎 방향)와 지면에 수직인 가상의 선 사이 각도
export function computeJointAngles(landmarks: NormalizedLandmark[]): JointAngle[] {
  const leftShoulder = landmarks[LEFT_SHOULDER];
  const rightShoulder = landmarks[RIGHT_SHOULDER];
  const leftHip = landmarks[LEFT_HIP];
  const rightHip = landmarks[RIGHT_HIP];

  return [
    {
      vertex: leftShoulder,
      degrees: angleBetween(leftShoulder, landmarks[LEFT_ELBOW], leftHip),
    },
    {
      vertex: rightShoulder,
      degrees: angleBetween(rightShoulder, landmarks[RIGHT_ELBOW], rightHip),
    },
    {
      vertex: leftHip,
      degrees: angleBetween(leftHip, landmarks[LEFT_KNEE], { x: leftHip.x, y: leftHip.y + 1 }),
    },
    {
      vertex: rightHip,
      degrees: angleBetween(rightHip, landmarks[RIGHT_KNEE], { x: rightHip.x, y: rightHip.y + 1 }),
    },
  ];
}
