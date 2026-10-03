import { useState } from "react";
import { useCamera } from "./camera/useCamera";
import { usePoseLandmarker } from "./camera/usePoseLandmarker";
import { useGroundContact } from "./camera/useGroundContact";
import { normalizeJointPosition } from "./guideline/normalize";
import { isInsideGuideline } from "./guideline/matchGuideline";
import type { Guideline } from "./guideline/types";
import { PoseCanvas } from "./components/PoseCanvas";
import { AdminPanel } from "./components/AdminPanel";
import { UserPanel } from "./components/UserPanel";
import { ModeToggleButton, type Mode } from "./components/ModeToggleButton";
import "./App.css";

function App() {
  const { videoRef, ready, error: cameraError } = useCamera();
  const [mode, setMode] = useState<Mode>("user");
  const { landmarks, loading: modelLoading, error: modelError } = usePoseLandmarker(videoRef, ready);
  const [selectedGuideline, setSelectedGuideline] = useState<Guideline | null>(null);
  const isAirborne = useGroundContact(landmarks);

  let isInside = false;
  if (mode === "user" && selectedGuideline && landmarks) {
    const point = normalizeJointPosition(landmarks, selectedGuideline.targetJoint);
    isInside = isInsideGuideline(point, selectedGuideline.path, selectedGuideline.tolerance);
  }

  return (
    <div className="app">
      <div className="panel">
        <PoseCanvas
          videoRef={videoRef}
          landmarks={landmarks}
          guideline={mode === "user" ? selectedGuideline : null}
          isInside={isInside}
          modeLabel={mode === "user" ? "사용자 모드" : "관리자 모드"}
          modeLabelDanger={mode === "user" && isAirborne}
          topOverlay={
            <>
              <h1>WalkLifePoseCoach</h1>
              <ModeToggleButton mode={mode} onToggle={() => setMode((m) => (m === "user" ? "admin" : "user"))} />
            </>
          }
          statusOverlay={
            (cameraError || modelError) ? (
              <p className="status-error">{cameraError ?? modelError}</p>
            ) : !ready ? (
              <p className="status-info">카메라를 시작하는 중...</p>
            ) : modelLoading ? (
              <p className="status-info">포즈 인식 모델을 불러오는 중...</p>
            ) : null
          }
        />

        {mode === "admin" ? (
          <AdminPanel landmarks={landmarks} />
        ) : (
          <UserPanel isInside={isInside} onSelectedGuidelineChange={setSelectedGuideline} />
        )}
      </div>
    </div>
  );
}

export default App;
