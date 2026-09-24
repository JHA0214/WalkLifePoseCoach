import { useEffect, useRef, type RefObject } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { denormalizePoint, getCenter } from "../guideline/normalize";
import { computeJointAngles } from "../guideline/angles";
import type { Guideline } from "../guideline/types";

// BlazePose 33포인트 중 0~10번은 얼굴(코/눈/귀/입), 15~22번은 손(손목/손가락) 랜드마크 — 점 표시에서 제외한다.
const FACE_LANDMARK_COUNT = 11;
const HAND_LANDMARK_RANGE = [15, 22] as const;

const CONNECTIONS: [number, number][] = [
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];

interface PoseCanvasProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  landmarks: NormalizedLandmark[] | null;
  guideline?: Guideline | null;
  isInside?: boolean;
  modeLabel?: string;
}

export function PoseCanvas({ videoRef, landmarks, guideline, isInside, modeLabel }: PoseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = video.clientWidth || video.videoWidth || 640;
    const height = video.clientHeight || video.videoHeight || 480;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.clearRect(0, 0, width, height);

    if (guideline && landmarks) {
      ctx.strokeStyle = isInside ? "#22c55e" : "#ef4444";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      guideline.path.forEach((p, i) => {
        const abs = denormalizePoint(p, landmarks);
        const x = abs.x * width;
        const y = abs.y * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    if (landmarks) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      for (const [a, b] of CONNECTIONS) {
        const pa = landmarks[a];
        const pb = landmarks[b];
        if (!pa || !pb) continue;
        ctx.beginPath();
        ctx.moveTo(pa.x * width, pa.y * height);
        ctx.lineTo(pb.x * width, pb.y * height);
        ctx.stroke();
      }

      ctx.fillStyle = "#facc15";
      landmarks.forEach((p, i) => {
        if (i < FACE_LANDMARK_COUNT) return;
        if (i >= HAND_LANDMARK_RANGE[0] && i <= HAND_LANDMARK_RANGE[1]) return;
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // 관절 각도 표시(어깨: 몸통과의 각도, 엉덩이: 지면 수직선과의 각도)
      const center = getCenter(landmarks);
      const cx = center.x * width;
      const cy = center.y * height;
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const { vertex, degrees } of computeJointAngles(landmarks)) {
        const vx = vertex.x * width;
        const vy = vertex.y * height;
        let dx = vx - cx;
        let dy = vy - cy;
        const len = Math.hypot(dx, dy) || 1;
        dx = (dx / len) * 22;
        dy = (dy / len) * 22;
        const label = `${Math.round(degrees)}°`;

        // canvas 엘리먼트 자체가 CSS로 좌우반전되어 있으므로, 텍스트를 미리 반전해서 그려야 화면에는 정상으로 보인다.
        ctx.save();
        ctx.translate(vx + dx, vy + dy);
        ctx.scale(-1, 1);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(15, 23, 42, 0.85)";
        ctx.strokeText(label, 0, 0);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }
    }
  }, [videoRef, landmarks, guideline, isInside]);

  return (
    <div className="camera-stage">
      <video ref={videoRef} className="camera-video" autoPlay playsInline muted />
      <canvas ref={canvasRef} className="camera-canvas" />
      {modeLabel && <div className="camera-mode-label">{modeLabel}</div>}
    </div>
  );
}
