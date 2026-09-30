import { useEffect, useRef, useState } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { normalizeJointPosition } from "../guideline/normalize";
import { simplifyPath } from "../guideline/simplify";
import { averagePaths } from "../guideline/averagePaths";
import type { PathPoint, TargetJoint, Guideline } from "../guideline/types";
import { createGuideline, deleteGuideline, fetchGuidelines, updateGuideline } from "../api/guidelines";

const JOINT_LABELS: Record<TargetJoint, string> = {
  left_wrist: "왼팔 (손목)",
  right_wrist: "오른팔 (손목)",
  left_ankle: "왼다리 (발목)",
  right_ankle: "오른다리 (발목)",
  pelvis: "골반",
};

const TAKES_REQUIRED = 3;

interface AdminPanelProps {
  landmarks: NormalizedLandmark[] | null;
}

export function AdminPanel({ landmarks }: AdminPanelProps) {
  const [targetJoint, setTargetJoint] = useState<TargetJoint>("left_wrist");
  const [recording, setRecording] = useState(false);
  const [recordedPath, setRecordedPath] = useState<PathPoint[]>([]);
  const [takes, setTakes] = useState<PathPoint[][]>([]);
  const [averagedPath, setAveragedPath] = useState<PathPoint[] | null>(null);
  const [name, setName] = useState("");
  const [tolerance, setTolerance] = useState(0.15);
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
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
    if (!landmarks) {
      setStatusMessage("카메라가 연결되어 있지 않아 녹화를 시작할 수 없습니다. 카메라 권한을 허용해주세요.");
      return;
    }
    setRecordedPath([]);
    recordingStartRef.current = null;
    setStatusMessage(null);
    setRecording(true);
  }

  function handleStopRecording() {
    setRecording(false);
    if (recordedPath.length < 2) {
      setStatusMessage("녹화된 동작이 너무 짧습니다. 이번 회차를 다시 녹화해주세요");
      setRecordedPath([]);
      return;
    }

    const nextTakes = [...takes, recordedPath];
    setRecordedPath([]);

    if (nextTakes.length < TAKES_REQUIRED) {
      setTakes(nextTakes);
      setStatusMessage(
        `${nextTakes.length}/${TAKES_REQUIRED}회 녹화 완료. 같은 동작을 ${TAKES_REQUIRED - nextTakes.length}번 더 반복해주세요`
      );
    } else {
      setTakes([]);
      setAveragedPath(averagePaths(nextTakes));
      setStatusMessage(`${TAKES_REQUIRED}회 녹화 완료. 평균 동선이 계산되었습니다`);
    }
  }

  function handleResetTakes() {
    setTakes([]);
    setAveragedPath(null);
    setRecordedPath([]);
    setStatusMessage(null);
  }

  async function handleSave() {
    if (!name.trim()) {
      setStatusMessage("이름을 입력해주세요");
      return;
    }
    if (!averagedPath || averagedPath.length < 2) {
      setStatusMessage(`녹화가 완료되지 않았습니다. ${TAKES_REQUIRED}회 녹화를 먼저 완료해주세요`);
      return;
    }
    const draft = {
      name: name.trim(),
      targetJoint,
      tolerance,
      path: simplifyPath(averagedPath),
    };
    try {
      if (editingId) {
        const updated = await updateGuideline(editingId, draft);
        setGuidelines((prev) => prev.map((g) => (g.id === editingId ? updated : g)));
        setStatusMessage(`"${updated.name}" 가이드라인이 수정되었습니다`);
        setEditingId(null);
      } else {
        const saved = await createGuideline(draft);
        setGuidelines((prev) => [saved, ...prev]);
        setStatusMessage(`"${saved.name}" 가이드라인이 저장되었습니다`);
      }
      setAveragedPath(null);
      setName("");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "저장에 실패했습니다");
    }
  }

  function handleEdit(g: Guideline) {
    setEditingId(g.id);
    setName(g.name);
    setTargetJoint(g.targetJoint);
    setTolerance(g.tolerance);
    setTakes([]);
    setAveragedPath(g.path);
    setStatusMessage(`"${g.name}" 수정 중입니다. 이름/허용오차를 바꾸거나 ${TAKES_REQUIRED}회 다시 녹화한 뒤 저장하세요`);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setTakes([]);
    setAveragedPath(null);
    setRecordedPath([]);
    setName("");
    setStatusMessage(null);
  }

  async function handleDelete(id: string) {
    try {
      await deleteGuideline(id);
      setGuidelines((prev) => prev.filter((g) => g.id !== id));
      if (editingId === id) handleCancelEdit();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "삭제에 실패했습니다");
    }
  }

  return (
    <div className="controls">
      <h2>가이드라인 녹화</h2>

      <label>
        추적할 신체 부위
        <select
          value={targetJoint}
          onChange={(e) => setTargetJoint(e.target.value as TargetJoint)}
          disabled={recording || takes.length > 0 || averagedPath !== null}
        >
          {Object.entries(JOINT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {!recording && !landmarks && (
        <p className="status-info">
          카메라가 연결되지 않았습니다. 저장된 가이드라인은 확인·수정·삭제할 수 있지만, 새로 녹화하려면
          카메라 권한이 필요합니다.
        </p>
      )}

      {!recording && averagedPath === null && (
        <p className="status-info">
          같은 동작을 {TAKES_REQUIRED}번 반복 녹화하면 평균 동선 하나로 정리되어 사용자 모드에 노출됩니다.
          ({takes.length}/{TAKES_REQUIRED}회 완료)
        </p>
      )}

      <div className="record-controls">
        {!recording && averagedPath === null && (
          <button type="button" onClick={handleStartRecording}>
            {takes.length === 0 ? "녹화 시작" : `${takes.length + 1}번째 동작 녹화 시작`} ({takes.length}/
            {TAKES_REQUIRED})
          </button>
        )}
        {recording && (
          <button type="button" className="danger" onClick={handleStopRecording}>
            녹화 종료 ({recordedPath.length}개 포인트)
          </button>
        )}
        {!recording && (takes.length > 0 || averagedPath !== null) && (
          <button type="button" className="secondary" onClick={handleResetTakes}>
            처음부터 다시 녹화
          </button>
        )}
      </div>

      {!recording && averagedPath !== null && (
        <div className="save-form">
          {editingId && <p className="status-info">수정 중인 가이드라인입니다</p>}
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
          <div className="save-form-actions">
            <button type="button" onClick={handleSave}>
              {editingId ? "수정 저장" : "가이드라인 저장"}
            </button>
            {editingId && (
              <button type="button" className="secondary" onClick={handleCancelEdit}>
                수정 취소
              </button>
            )}
          </div>
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
            <div className="guideline-actions">
              <button type="button" className="secondary" onClick={() => handleEdit(g)}>
                수정
              </button>
              <button type="button" onClick={() => handleDelete(g.id)}>
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
