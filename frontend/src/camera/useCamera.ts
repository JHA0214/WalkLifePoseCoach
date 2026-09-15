import { useEffect, useRef, useState } from "react";

const CAMERA_ERROR_MESSAGES: Record<string, string> = {
  NotAllowedError: "카메라 접근 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.",
  NotFoundError: "사용할 수 있는 카메라를 찾을 수 없습니다.",
  NotReadableError: "카메라를 사용할 수 없습니다. 다른 앱이 카메라를 사용 중인지 확인해주세요.",
  OverconstrainedError: "요청한 카메라 설정을 지원하지 않습니다.",
  SecurityError: "보안 정책으로 인해 카메라에 접근할 수 없습니다.",
  AbortError: "카메라 시작이 중단되었습니다.",
};

function toCameraErrorMessage(err: unknown): string {
  if (err instanceof DOMException && CAMERA_ERROR_MESSAGES[err.name]) {
    return CAMERA_ERROR_MESSAGES[err.name];
  }
  return "카메라를 시작할 수 없습니다";
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(toCameraErrorMessage(err));
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return { videoRef, ready, error };
}
