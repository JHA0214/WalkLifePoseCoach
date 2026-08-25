export type Mode = "user" | "admin";

interface ModeToggleButtonProps {
  mode: Mode;
  onToggle: () => void;
}

export function ModeToggleButton({ mode, onToggle }: ModeToggleButtonProps) {
  return (
    <button type="button" className="mode-toggle" onClick={onToggle}>
      {mode === "user" ? "관리자 모드 진입" : "사용자 모드로 전환"}
    </button>
  );
}
