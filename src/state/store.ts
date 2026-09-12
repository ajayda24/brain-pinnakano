import { create } from 'zustand';
import { BASE_PROCESSES, TRANSIENT_PROCESSES, type ProcessDef } from '../config/processes';
import { TONE_COLOR, type AlertDef } from '../config/errors';

export type Stage = 'boot' | 'intro' | 'scan' | 'desktop' | 'final' | 'certificate';
export type DesktopView = 'dashboard' | 'reels' | 'brainlab';

export interface LiveProcess extends ProcessDef {
  /** live CPU, written by the metrics engine */
  liveCpu: number;
  history: number[];
  statusNow: string;
  spawnedAt: number;
  expiresAt: number | null;
  ended: boolean;
}

export interface Notification extends AlertDef {
  key: number;
  color: string;
  at: number;
}

const toLive = (p: ProcessDef, now: number): LiveProcess => ({
  ...p,
  liveCpu: p.cpu,
  history: Array.from({ length: 24 }, () => p.cpu),
  statusNow: p.status ?? 'Running',
  spawnedAt: now,
  expiresAt: null,
  ended: false,
});

interface AppState {
  stage: Stage;
  view: DesktopView;
  userName: string;
  processes: LiveProcess[];
  selectedProcess: string | null;
  notifications: Notification[];
  /** shown in the About dialog */
  aboutOpen: boolean;

  setStage: (s: Stage) => void;
  setView: (v: DesktopView) => void;
  setUserName: (n: string) => void;
  setAboutOpen: (v: boolean) => void;

  selectProcess: (id: string | null) => void;
  spawnProcess: (key: keyof typeof TRANSIENT_PROCESSES, ttlMs: number) => void;
  setProcessStatus: (id: string, status: string) => void;
  endProcess: (id: string) => void;
  restartProcess: (id: string) => void;
  reapProcesses: (now: number) => void;

  notify: (a: AlertDef) => void;
  dismiss: (key: number) => void;
}

let notifKey = 1;

export const useApp = create<AppState>((set, get) => ({
  stage: 'boot',
  view: 'dashboard',
  userName: '',
  processes: BASE_PROCESSES.map((p) => toLive(p, Date.now())),
  selectedProcess: null,
  notifications: [],
  aboutOpen: false,

  setStage: (stage) => set({ stage }),
  setView: (view) => set({ view, selectedProcess: null }),
  setUserName: (userName) => set({ userName }),
  setAboutOpen: (aboutOpen) => set({ aboutOpen }),

  selectProcess: (selectedProcess) => set({ selectedProcess }),

  spawnProcess: (key, ttlMs) => {
    const def = TRANSIENT_PROCESSES[key];
    if (!def) return;
    const now = Date.now();
    const existing = get().processes.find((p) => p.id === def.id);
    if (existing) {
      // already running — just extend its life
      set((s) => ({
        processes: s.processes.map((p) =>
          p.id === def.id ? { ...p, expiresAt: now + ttlMs, ended: false } : p,
        ),
      }));
      return;
    }
    set((s) => ({
      processes: [{ ...toLive(def, now), expiresAt: now + ttlMs }, ...s.processes],
    }));
  },

  setProcessStatus: (id, statusNow) =>
    set((s) => ({
      processes: s.processes.map((p) => (p.id === id ? { ...p, statusNow } : p)),
    })),

  // NB: deliberately does NOT clear `selectedProcess`. This is called from the
  // metrics engine too (LOOK_AWAY kills Focus.exe), and clearing the selection
  // there would slam shut whatever dialog the user has open, just because they
  // glanced away from the camera.
  endProcess: (id) =>
    set((s) => ({
      processes: s.processes.map((p) =>
        p.id === id ? { ...p, ended: true, statusNow: 'Terminated', liveCpu: 0 } : p,
      ),
    })),

  restartProcess: (id) =>
    set((s) => ({
      processes: s.processes.map((p) =>
        p.id === id ? { ...p, ended: false, statusNow: p.status ?? 'Running' } : p,
      ),
    })),

  reapProcesses: (now) => {
    const stale = get().processes.some((p) => p.expiresAt !== null && p.expiresAt < now);
    if (!stale) return;
    set((s) => ({
      processes: s.processes.filter((p) => p.expiresAt === null || p.expiresAt >= now),
    }));
  },

  notify: (a) => {
    const n: Notification = { ...a, key: notifKey++, color: TONE_COLOR[a.tone], at: Date.now() };
    set((s) => {
      // never stack more than 3, and never repeat a title that is already up
      if (s.notifications.some((x) => x.title === a.title)) return s;
      return { notifications: [...s.notifications, n].slice(-3) };
    });
  },

  dismiss: (key) => set((s) => ({ notifications: s.notifications.filter((n) => n.key !== key) })),
}));
