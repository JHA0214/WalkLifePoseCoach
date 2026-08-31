import { useEffect, useRef, useState } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { normalizeJointPosition } from "../guideline/normalize";
import type { PathPoint, TargetJoint, Guideline } from "../guideline/types";
import { createGuideline, deleteGuideline, fetchGuidelines } from "../api/guidelines";

const JOINT_LABELS: Record<TargetJoint, string> = {
  left_wrist: "왼팔 (손목)",
  right_wrist: "오른팔 (손목)",
  left_ankle: "왼다리 (발목)",
  right_ankle: "오른다리 (발목)",
};

interface AdminPanelProps {
  landmarks: NormalizedLandmark[] | null;
}

export function AdminPanel({ landmarks }: AdminPanelProps) {
  const [targetJoint, setTargetJoint] = useState<TargetJoint>("left_wrist");
  const [recording, setRecording] = useState(false);
  const [recordedPath, setRecordedPath] = useState<PathPoint[]>([]);
  const [name, setName] = useState("");
  const [tolerance, setTolerance] = useState(0.15);
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const recordingStartRef = useRef<number | null>(null);

  useEffect(() => {
    fetchGuidelines()
      .then(setGuidelines)
      .catch((err) => setStatusMessage(err instanceof Error ? err.message : "목록을 불러오지 못했습니다"));
  }, []);

  useEffect(() => {
    if (!recording || !landmarks) return;
    if (recordingStartRef.current === null) {
      recordingStartRef.current = performance.now();
    }
    const t = performance.now() - recordingStartRef.current;
    const point = normalizeJointPosition(landmarks, targetJoint);
    setRecordedPath((prev) => [...prev, { t, x: point.x, y: point.y }]);
  }, [landmarks, recording, targetJoint]);

  function handleStartRecording() {
    setRecordedPath([]);
    recordingStartRef.current = null;
    setStatusMessage(null);
    setRecording(true);
  }

  function handleStopRecording() {
    setRecording(false);
  }

  async function handleSave() {
    if (!name.trim()) {
      setStatusMessage("이름을 입력해주세요");
      return;
    }
    if (recordedPath.length < 2) {
      setStatusMessage("녹화된 동작이 너무 짧습니다. 다시 녹화해주세요");
      return;
    }
    try {
      const saved = await createGuideline({
        name: name.trim(),
        targetJoint,
        tolerance,
        path: recordedPath,
      });
      setGuidelines((prev) => [saved, ...prev]);
      setRecordedPath([]);
      setName("");
      setStatusMessage(`"${saved.name}" 가이드라인이 저장되었습니다`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "저장에 실패했습니다");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteGuideline(id);
      setGuidelines((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "삭제에 실패했습니다");
    }
  }

  return (
    <div className="controls">
      <h2>관리자 모드 - 가이드라인 녹화</h2>

      <label>
        추적할 신체 부위
        <select
          value={targetJoint}
          onChange={(e) => setTargetJoint(e.target.value as TargetJoint)}
          disabled={recording}
        >
          {Object.entries(JOINT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="record-controls">
        {!recording ? (
          <button type="button" onClick={handleStartRecording}>
            녹화 시작
          </button>
        ) : (
          <button type="button" className="danger" onClick={handleStopRecording}>
            녹화 종료 ({recordedPath.length}개 포인트)
          </button>
        )}
      </div>

      {!recording && recordedPath.length > 0 && (
        <div className="save-form">
          <label>
            가이드라인 이름
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 왼팔 들어올리기"
            />
          </label>
          <label>
            허용 오차: {tolerance.toFixed(2)}
            <input
              type="range"
              min={0.05}
              max={0.4}
              step={0.01}
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
            />
          </label>
          <button type="button" onClick={handleSave}>
            가이드라인 저장
          </button>
        </div>
      )}

      {statusMessage && <p className="status-message">{statusMessage}</p>}

      <h3>저장된 가이드라인</h3>
      <ul className="guideline-list">
        {guidelines.map((g) => (
          <li key={g.id}>
            <span>
              {g.name} ({JOINT_LABELS[g.targetJoint]})
            </span>
            <button type="button" onClick={() => handleDelete(g.id)}>
              삭제
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
