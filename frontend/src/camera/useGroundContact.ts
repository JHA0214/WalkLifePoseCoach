import { useEffect, useRef, useState } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { getTorsoScale } from "../guideline/normalize";

const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;

// 발이 토르소 길이 대비 이 비율 이상 떠오르면 "공중"으로 판정한다.
const AIRBORNE_RATIO = 0.15;
// 기준 지면 높이가 카메라와의 거리 변화 등으로 서서히 보정되는 속도(0~1).
const GROUND_DECAY = 0.01;

// 양발 모두 기준 지면보다 일정 이상 떠 있으면(점프 등) true를 반환한다.
// 한쪽 발만 뜨는 걷기/제자리걸음 동작은 공중 판정에서 제외된다.
export function useGroundContact(landmarks: NormalizedLandmark[] | null): boolean {
  const groundYRef = useRef<{ left: number | null; right: number | null }>({ left: null, right: null });
  const [isAirborne, setIsAirborne] = useState(false);

  useEffect(() => {
    if (!landmarks) return;
    const left = landmarks[LEFT_ANKLE];
    const right = landmarks[RIGHT_ANKLE];
    if (!left || !right) return;

    const threshold = getTorsoScale(landmarks) * AIRBORNE_RATIO;
    const ground = groundYRef.current;

    // y는 아래로 갈수록 커지므로, 발이 더 내려갈 때(y가 커질 때)는 즉시 새 지면으로 갱신하고
    // 발이 떠올랐을 때(y가 작아질 때)는 기준선을 서서히만 따라가게 해 잠깐의 점프에 흔들리지 않게 한다.
    ground.left = ground.left === null || left.y > ground.left
      ? left.y
      : ground.left * (1 - GROUND_DECAY) + left.y * GROUND_DECAY;
    ground.right = ground.right === null || right.y > ground.right
      ? right.y
      : ground.right * (1 - GROUND_DECAY) + right.y * GROUND_DECAY;

    const leftAirborne = ground.left - left.y > threshold;
    const rightAirborne = ground.right - right.y > threshold;
    setIsAirborne(leftAirborne && rightAirborne);
  }, [landmarks]);

  return isAirborne;
}
