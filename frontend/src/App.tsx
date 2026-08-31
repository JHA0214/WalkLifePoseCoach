import { useState } from "react";
import { useCamera } from "./camera/useCamera";
import { usePoseLandmarker } from "./camera/usePoseLandmarker";
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

  let isInside = false;
  if (mode === "user" && selectedGuideline && landmarks) {
    const point = normalizeJointPosition(landmarks, selectedGuideline.targetJoint);
    isInside = isInsideGuideline(point, selectedGuideline.path, selectedGuideline.tolerance);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>WalkLifePoseCoach</h1>
        <ModeToggleButton mode={mode} onToggle={() => setMode((m) => (m === "user" ? "admin" : "user"))} />
      </header>

      {(cameraError || modelError) && <p className="status-error">{cameraError ?? modelError}</p>}
      {!cameraError && !ready && <p className="status-info">카메라를 시작하는 중...</p>}
      {ready && modelLoading && <p className="status-info">포즈 인식 모델을 불러오는 중...</p>}

      <div className="panel">
        <PoseCanvas
          videoRef={videoRef}
          landmarks={landmarks}
          guideline={mode === "user" ? selectedGuideline : null}
          isInside={isInside}
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
