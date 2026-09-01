import { useEffect, useRef, type RefObject } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { denormalizePoint } from "../guideline/normalize";
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
}

export function PoseCanvas({ videoRef, landmarks, guideline, isInside }: PoseCanvasProps) {
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
    }
  }, [videoRef, landmarks, guideline, isInside]);

  return (
    <div className="camera-stage">
      <video ref={videoRef} className="camera-video" autoPlay playsInline muted />
      <canvas ref={canvasRef} className="camera-canvas" />
    </div>
  );
}
