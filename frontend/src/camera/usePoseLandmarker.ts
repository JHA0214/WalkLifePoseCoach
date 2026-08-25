import { useEffect, useRef, useState, type RefObject } from "react";
import { FilesetResolver, PoseLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export function usePoseLandmarker(videoRef: RefObject<HTMLVideoElement | null>, active: boolean) {
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(WASM_BASE);
        const landmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "포즈 인식 모델을 불러오지 못했습니다");
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!active || loading || error) return;

    function loop() {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (video && landmarker && video.readyState >= 2) {
        const result = landmarker.detectForVideo(video, performance.now());
        setLandmarks(result.landmarks[0] ?? null);
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, loading, error, videoRef]);

  return { landmarks, loading, error };
}
