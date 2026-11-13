import { GamePhase } from '../../game/types';
import { cycleViewMode, getViewMode } from '../../game/controls';

/**
 * Keyboard / pointer input shared by the simulation loop and the touch overlay.
 *
 * Held keys and one-frame "just pressed" edges live in `Set`s so the loop can ask
 * `has()` on any code without allocating, and the Space/E buffer doubles as the
 * throw-input that keeps a 140 ms grace window open after the key is released.
 */
export interface InputState {
  keysHeld: Set<string>;
  keysJustPressed: Set<string>;
  spaceBufferTimer: number;
  pointerDown: boolean;
  pointerClientX: number;
  pointerClientY: number;
}

export function createInputState(): InputState {
  return {
    keysHeld: new Set<string>(),
    keysJustPressed: new Set<string>(),
    spaceBufferTimer: 0,
    pointerDown: false,
    pointerClientX: 0,
    pointerClientY: 0,
  };
}

/** Clears every held/edge/pointer flag without touching touch-overlay state. */
export function clearInputState(state: InputState): void {
  state.keysHeld.clear();
  state.keysJustPressed.clear();
  state.pointerDown = false;
  state.spaceBufferTimer = 0;
}

export interface InputListenerDeps {
  state: InputState;
  /** Element that owns the pointer-down gesture (the WebGL canvas). */
  canvas: HTMLCanvasElement;
  getPhase: () => GamePhase;
  isDemoActive: () => boolean;
  playClick: () => void;
  /** Escape while the autopilot reel is running hands control back to the player. */
  onExitDemo: () => void;
  /** Cycles the chase-camera view mode (chase / far / top) and reports the new one. */
  onCycleView: (mode: ReturnType<typeof getViewMode>) => void;
  onTogglePause: (next: GamePhase) => void;
  /** Fired on window blur / tab hide so the van never keeps driving unattended. */
  onFocusLost: () => void;
}

const SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];

/**
 * Wires the global keyboard and pointer listeners and returns a detach function.
 *
 * Only codes the game actually consumes are prevented from scrolling the page, and
 * only while a shift is running, so the surrounding page keeps normal behaviour on
 * the title screen.
 */
export function attachInputListeners(deps: InputListenerDeps): () => void {
  const { state, canvas } = deps;

  const onKeyDown = (e: KeyboardEvent) => {
    if (SCROLL_KEYS.includes(e.code) && deps.getPhase() === GamePhase.Playing) {
      e.preventDefault();
    }
    if (
      e.code === 'Escape' &&
      !e.repeat &&
      deps.isDemoActive() &&
      deps.getPhase() === GamePhase.Playing
    ) {
      e.preventDefault();
      deps.onFocusLost();
      deps.playClick();
      deps.onExitDemo();
      return;
    }
    // V cycles chase / far / top framing at any time (persisted per player).
    if (e.code === 'KeyV' && !e.repeat) {
      deps.onCycleView(cycleViewMode());
      return;
    }
    if (deps.getPhase() === GamePhase.Playing) {
      if (!state.keysHeld.has(e.code)) {
        state.keysJustPressed.add(e.code);
      }
      state.keysHeld.add(e.code);
      if (e.code === 'Space' || e.code === 'KeyE') {
        state.spaceBufferTimer = 0.14;
      }
    }
    if (
      (e.code === 'Escape' || e.code === 'KeyP') &&
      !e.repeat &&
      (deps.getPhase() === GamePhase.Playing || deps.getPhase() === GamePhase.Paused)
    ) {
      deps.onFocusLost();
      deps.playClick();
      deps.onTogglePause(
        deps.getPhase() === GamePhase.Playing ? GamePhase.Paused : GamePhase.Playing,
      );
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    state.keysHeld.delete(e.code);
  };

  const onBlurOrHidden = () => {
    deps.onFocusLost();
  };

  const onPointerDown = (e: PointerEvent) => {
    if (deps.getPhase() !== GamePhase.Playing) return;
    if (e.button !== 0) return;
    state.pointerDown = true;
    state.pointerClientX = e.clientX;
    state.pointerClientY = e.clientY;
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!state.pointerDown) return;
    state.pointerClientX = e.clientX;
    state.pointerClientY = e.clientY;
  };

  const onPointerUp = () => {
    state.pointerDown = false;
  };

  const onVisChange = () => {
    if (document.hidden) onBlurOrHidden();
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlurOrHidden);
  document.addEventListener('visibilitychange', onVisChange);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlurOrHidden);
    document.removeEventListener('visibilitychange', onVisChange);
    canvas.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };
}
