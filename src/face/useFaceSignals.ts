import { useEffect, useRef, useState } from 'react';
import { faceEngine, type EngineStatus } from './faceEngine';
import { EMPTY_SIGNALS, type FaceFrame, type FaceSignals } from './signals';
import type { FaceEvent } from './events';

/**
 * Imperative subscription — the callback runs on every engine frame (~20Hz) and
 * does NOT re-render. Use this for canvas drawing and direct DOM writes.
 */
export function useFaceFrame(fn: (f: FaceFrame) => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => faceEngine.subscribe((f) => ref.current(f)), []);
}

/**
 * Re-rendering subscription, throttled so React is not asked to reconcile 20
 * times a second. Only for readouts where a little latency is invisible.
 */
export function useFaceSignals(hz = 8): FaceSignals {
  const [signals, setSignals] = useState<FaceSignals>(faceEngine.lastFrame.signals);
  const last = useRef(0);
  useEffect(() => {
    const interval = 1000 / hz;
    return faceEngine.subscribe((f) => {
      const now = performance.now();
      if (now - last.current < interval) return;
      last.current = now;
      setSignals(f.signals);
    });
  }, [hz]);
  return signals;
}

export function useFaceEvents(fn: (e: FaceEvent) => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => faceEngine.onEvent((e) => ref.current(e)), []);
}

export function useEngineStatus(): EngineStatus {
  const [status, setStatus] = useState<EngineStatus>(faceEngine.status);
  useEffect(() => faceEngine.onStatus(setStatus), []);
  return status;
}

/** Attach the live camera stream to a <video>, mirrored by the caller's CSS. */
export function useCameraVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    let cancelled = false;
    const attach = () => {
      const el = ref.current;
      if (!el || cancelled) return;
      if (faceEngine.stream && el.srcObject !== faceEngine.stream) {
        el.srcObject = faceEngine.stream;
        el.play().catch(() => undefined);
      }
    };
    attach();
    // the stream may arrive after this component mounts
    const off = faceEngine.onStatus(attach);
    return () => {
      cancelled = true;
      off();
    };
  }, []);
  return ref;
}

export { EMPTY_SIGNALS };
