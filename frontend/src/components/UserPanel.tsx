import { useEffect, useState, type RefObject } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { PoseCanvas } from "./PoseCanvas";
import { normalizeJointPosition } from "../guideline/normalize";
import { isInsideGuideline } from "../guideline/matchGuideline";
import type { Guideline, TargetJoint } from "../guideline/types";
import { fetchGuidelines } from "../api/guidelines";

const JOINT_LABELS: Record<TargetJoint, string> = {
  left_wrist: "왼팔 (손목)",
  right_wrist: "오른팔 (손목)",
  left_ankle: "왼다리 (발목)",
  right_ankle: "오른다리 (발목)",
};

interface UserPanelProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  landmarks: NormalizedLandmark[] | null;
}

export function UserPanel({ videoRef, landmarks }: UserPanelProps) {
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGuidelines()
      .then((list) => {
        setGuidelines(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "목록을 불러오지 못했습니다"));
  }, []);

  const selected = guidelines.find((g) => g.id === selectedId) ?? null;

  let isInside = false;
  if (selected && landmarks) {
    const point = normalizeJointPosition(landmarks, selected.targetJoint);
    isInside = isInsideGuideline(point, selected.path, selected.tolerance);
  }

  return (
    <div className="panel">
      <PoseCanvas videoRef={videoRef} landmarks={landmarks} guideline={selected} isInside={isInside} />

      <div className="controls">
        <h2>사용자 모드</h2>

        {error && <p className="status-error">{error}</p>}
        {guidelines.length === 0 && !error && (
          <p className="status-info">저장된 가이드라인이 없습니다. 관리자 모드에서 먼저 등록해주세요.</p>
        )}

        {guidelines.length > 0 && (
          <label>
            가이드라인 선택
            <select value={selectedId ?? ""} onChange={(e) => setSelectedId(e.target.value)}>
              {guidelines.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({JOINT_LABELS[g.targetJoint]})
                </option>
              ))}
            </select>
          </label>
        )}

        {selected && (
          <p className={`match-status ${isInside ? "inside" : "outside"}`}>
            {isInside ? "가이드라인 안에 있습니다" : "가이드라인을 벗어났습니다"}
          </p>
        )}
      </div>
    </div>
  );
}
