import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { TargetJoint } from "./types";

export interface Point {
  x: number;
  y: number;
}

const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;

export const JOINT_INDEX: Record<TargetJoint, number> = {
  left_wrist: 15,
  right_wrist: 16,
  left_ankle: 27,
  right_ankle: 28,
};

// 몸의 중심 = 양쪽 어깨/엉덩이 4점의 평균 위치
export function getCenter(landmarks: NormalizedLandmark[]): Point {
  const ls = landmarks[LEFT_SHOULDER];
  const rs = landmarks[RIGHT_SHOULDER];
  const lh = landmarks[LEFT_HIP];
  const rh = landmarks[RIGHT_HIP];
  return {
    x: (ls.x + rs.x + lh.x + rh.x) / 4,
    y: (ls.y + rs.y + lh.y + rh.y) / 4,
  };
}

// 체형/카메라 거리 차이를 흡수하기 위한 스케일(어깨 중점-엉덩이 중점 거리 = 몸통 길이)
export function getTorsoScale(landmarks: NormalizedLandmark[]): number {
  const ls = landmarks[LEFT_SHOULDER];
  const rs = landmarks[RIGHT_SHOULDER];
  const lh = landmarks[LEFT_HIP];
  const rh = landmarks[RIGHT_HIP];
  const shoulderMid = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
  const hipMid = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
  const dx = shoulderMid.x - hipMid.x;
  const dy = shoulderMid.y - hipMid.y;
  return Math.max(Math.sqrt(dx * dx + dy * dy), 1e-6);
}

// 관절의 절대좌표 -> 중심 기준 상대좌표(정규화)
export function normalizeJointPosition(landmarks: NormalizedLandmark[], joint: TargetJoint): Point {
  const center = getCenter(landmarks);
  const scale = getTorsoScale(landmarks);
  const p = landmarks[JOINT_INDEX[joint]];
  return {
    x: (p.x - center.x) / scale,
    y: (p.y - center.y) / scale,
  };
}

// 중심 기준 상대좌표 -> 현재 프레임 기준 절대좌표(화면에 그리기 위함)
export function denormalizePoint(relative: Point, landmarks: NormalizedLandmark[]): Point {
  const center = getCenter(landmarks);
  const scale = getTorsoScale(landmarks);
  return {
    x: center.x + relative.x * scale,
    y: center.y + relative.y * scale,
  };
}
