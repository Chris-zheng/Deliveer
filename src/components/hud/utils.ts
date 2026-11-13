// Small pure formatting helpers shared by the HUD panes.
function toHexColor(num: number): string {
  return '#' + num.toString(16).padStart(6, '0');
}

function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.ceil(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function triggerWindowKeyPulse(code: string): void {
  window.dispatchEvent(
    new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true }),
  );
  window.setTimeout(() => {
    window.dispatchEvent(
      new KeyboardEvent('keyup', { code, bubbles: true, cancelable: true }),
    );
  }, 65);
}

export { toHexColor, formatClock, triggerWindowKeyPulse };
