/**
 * The one place that touches the camera.
 *
 * PRIVACY: frames are read into MediaPipe in-page and thrown away. Nothing is
 * recorded, uploaded, or persisted anywhere — there is no server in this app.
 *
 * Degradation ladder, so a demo never dies on stage:
 *   1. camera + model      -> real analysis
 *   2. camera, no model    -> live video, simulated signals (clearly labelled)
 *   3. no camera           -> full simulation (clearly labelled)
 */

import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { FaceEventDetector, type FaceEvent } from './events';
import {
  deriveSignals,
  EMPTY_SIGNALS,
  poseFromMatrix,
  SignalSmoother,
  toShapeMap,
  type FaceFrame,
  type Landmark,
} from './signals';
import { FaceSimulator } from './simulation';

const asset = (p: string) => new URL(p, document.baseURI).href;

export interface EngineStatus {
  cameraOk: boolean;
  modelOk: boolean;
  /** signals are invented rather than read from a face */
  simulated: boolean;
  reason: string | null;
}

type FrameListener = (f: FaceFrame) => void;
type EventListener = (e: FaceEvent) => void;
type StatusListener = (s: EngineStatus) => void;

const FORCED_SIM =
  typeof location !== 'undefined' && new URLSearchParams(location.search).has('sim');

class FaceEngine {
  stream: MediaStream | null = null;
  status: EngineStatus = { cameraOk: false, modelOk: false, simulated: true, reason: null };
  lastFrame: FaceFrame = { signals: { ...EMPTY_SIGNALS }, landmarks: null, source: 'simulation' };

  private video: HTMLVideoElement | null = null;
  private landmarker: FaceLandmarker | null = null;
  private simulator = new FaceSimulator();
  private smoother = new SignalSmoother(0.25);
  private detector = new FaceEventDetector();

  private frameSubs = new Set<FrameListener>();
  private eventSubs = new Set<EventListener>();
  private statusSubs = new Set<StatusListener>();

  private raf = 0;
  private running = false;
  private lastVideoTime = -1;
  private lastDetect = 0;
  private prevNose: Landmark | null = null;
  private prevPose: { yaw: number; pitch: number; roll: number } | null = null;
  private startPromise: Promise<EngineStatus> | null = null;
  /** set by ?sim=1, or chosen by the user before the scan starts */
  private forced = FORCED_SIM;

  /** Opt into simulation before start() — used by the "no camera" path. */
  forceSimulation(reason = 'Simulation mode was selected.') {
    this.forced = true;
    this.setStatus({ reason });
  }

  // ---------- subscriptions ----------

  subscribe(fn: FrameListener) {
    this.frameSubs.add(fn);
    return () => {
      this.frameSubs.delete(fn);
    };
  }
  onEvent(fn: EventListener) {
    this.eventSubs.add(fn);
    return () => {
      this.eventSubs.delete(fn);
    };
  }
  onStatus(fn: StatusListener) {
    this.statusSubs.add(fn);
    fn(this.status);
    return () => {
      this.statusSubs.delete(fn);
    };
  }

  /** Lets Reel Lab tell the simulator that something funny is on screen. */
  setArousal(a: number) {
    this.simulator.setArousal(a);
  }

  // ---------- lifecycle ----------

  start(): Promise<EngineStatus> {
    if (this.startPromise) return this.startPromise;
    this.startPromise = this.boot();
    return this.startPromise;
  }

  private async boot(): Promise<EngineStatus> {
    if (!this.forced) {
      await Promise.all([this.initCamera(), this.initModel()]);
    } else if (!this.status.reason) {
      this.setStatus({ reason: 'Simulation forced with ?sim=1.' });
    }
    this.setStatus({}); // recomputes `simulated`
    this.loop();
    return this.status;
  }

  private async initCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.setStatus({ reason: 'This browser exposes no camera API.' });
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      const v = document.createElement('video');
      v.autoplay = true;
      v.muted = true;
      v.playsInline = true;
      v.srcObject = this.stream;
      await v.play().catch(() => undefined);
      this.video = v;
      this.setStatus({ cameraOk: true });
    } catch (err) {
      const name = (err as Error)?.name ?? '';
      this.setStatus({
        cameraOk: false,
        reason:
          name === 'NotAllowedError'
            ? 'Camera permission was declined.'
            : name === 'NotFoundError'
              ? 'No camera was found on this device.'
              : `Camera unavailable (${name || 'unknown error'}).`,
      });
    }
  }

  private async initModel() {
    try {
      const fileset = await FilesetResolver.forVisionTasks(asset('mp/wasm'));
      this.landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: asset('mp/models/face_landmarker.task'),
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });
      this.setStatus({ modelOk: true });
    } catch (err) {
      this.setStatus({
        modelOk: false,
        reason: `Face model failed to load (${(err as Error)?.message ?? 'unknown'}).`,
      });
    }
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video = null;
    this.startPromise = null;
    this.setStatus({ cameraOk: false });
  }

  // ---------- main loop ----------

  private loop = () => {
    if (this.running) return;
    this.running = true;
    const tick = () => {
      this.raf = requestAnimationFrame(tick);
      const now = performance.now();
      // ~20fps is plenty and leaves the GPU to the rest of the UI
      if (now - this.lastDetect < 48) return;
      this.lastDetect = now;
      try {
        this.step(now);
      } catch {
        /* a bad frame must never kill the loop */
      }
    };
    this.raf = requestAnimationFrame(tick);
  };

  private step(now: number) {
    let frame: FaceFrame;

    if (this.status.modelOk && this.video && this.video.readyState >= 2) {
      frame = this.detect(now) ?? this.simulate(now);
    } else {
      frame = this.simulate(now);
    }

    this.lastFrame = frame;
    for (const fn of this.frameSubs) fn(frame);

    for (const ev of this.detector.update(frame.signals, now)) {
      for (const fn of this.eventSubs) fn(ev);
    }
  }

  private detect(now: number): FaceFrame | null {
    const video = this.video!;
    if (video.currentTime === this.lastVideoTime) return this.lastFrame;
    this.lastVideoTime = video.currentTime;

    let res: FaceLandmarkerResult;
    try {
      res = this.landmarker!.detectForVideo(video, now);
    } catch {
      return null;
    }

    const landmarks = res.faceLandmarks?.[0] as Landmark[] | undefined;
    if (!landmarks || !res.faceBlendshapes?.length) {
      const signals = { ...EMPTY_SIGNALS, t: now, present: false };
      this.smoother.reset();
      this.prevNose = null;
      return { signals, landmarks: null, source: 'camera' };
    }

    const shapes = toShapeMap(res.faceBlendshapes[0].categories);
    const matrix = res.facialTransformationMatrixes?.[0]?.data;
    const pose = matrix ? poseFromMatrix(matrix) : { yaw: 0, pitch: 0, roll: 0 };

    // Motion energy: how far the head moved since the previous frame, combining
    // nose-tip translation with rotation. Scaled so a brisk head-shake ~ 1.0.
    const nose = landmarks[1];
    let motion = 0;
    if (this.prevNose) {
      const dx = nose.x - this.prevNose.x;
      const dy = nose.y - this.prevNose.y;
      motion += Math.hypot(dx, dy) * 26;
    }
    if (this.prevPose) {
      const dr =
        Math.abs(pose.yaw - this.prevPose.yaw) +
        Math.abs(pose.pitch - this.prevPose.pitch) +
        Math.abs(pose.roll - this.prevPose.roll);
      motion += dr / 24;
    }
    this.prevNose = nose;
    this.prevPose = pose;

    const raw = deriveSignals(shapes, pose, motion, now);
    return { signals: this.smoother.smooth(raw), landmarks, source: 'camera' };
  }

  private simulate(now: number): FaceFrame {
    const { signals, landmarks } = this.simulator.next(now);
    return {
      signals: this.smoother.smooth(signals),
      landmarks,
      // labelled honestly even when a real camera image is on screen
      source: 'simulation',
    };
  }

  private setStatus(patch: Partial<EngineStatus>) {
    this.status = { ...this.status, ...patch };
    this.status.simulated = !this.status.modelOk || !this.status.cameraOk || this.forced;
    for (const fn of this.statusSubs) fn(this.status);
  }
}

export const faceEngine = new FaceEngine();
export const isForcedSim = FORCED_SIM;
