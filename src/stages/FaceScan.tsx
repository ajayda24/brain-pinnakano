import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { faceEngine } from '../face/faceEngine';
import { useCameraVideo, useEngineStatus, useFaceFrame, useFaceSignals } from '../face/useFaceSignals';
import { analysisRows } from '../face/signals';
import { FaceOverlay } from '../components/WebcamPip';
import { Panel, Chip, Bar } from '../components/ui/primitives';
import { useApp } from '../state/store';

const CHECKS = [
  { label: 'FACE DETECTED', mark: '✓', tone: 'ok' },
  { label: 'EYES DETECTED', mark: '✓', tone: 'ok' },
  { label: 'NOSE DETECTED', mark: '✓', tone: 'ok' },
  { label: 'MOUTH DETECTED', mark: '✓', tone: 'ok' },
  { label: 'BRAIN DETECTED', mark: '?', tone: 'warn' },
] as const;

export function FaceScan() {
  const setStage = useApp((s) => s.setStage);
  const userName = useApp((s) => s.userName);
  const setUserName = useApp((s) => s.setUserName);

  const status = useEngineStatus();
  const videoRef = useCameraVideo();
  const signals = useFaceSignals(8);

  const [booting, setBooting] = useState(true);
  const [revealed, setRevealed] = useState(0);
  /** camera + model are fine, but nothing face-shaped has turned up */
  const [stalled, setStalled] = useState(false);
  const seenFace = useRef(false);

  // start the engine once; it resolves even when everything fails
  useEffect(() => {
    let alive = true;
    faceEngine.start().then(() => {
      if (alive) setBooting(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  // reveal the checklist as soon as a subject (real or simulated) appears
  useFaceFrame((f) => {
    if (f.signals.present) seenFace.current = true;
  });

  useEffect(() => {
    if (booting) return;
    const t = window.setInterval(() => {
      setRevealed((n) => {
        if (n >= CHECKS.length) {
          window.clearInterval(t);
          return n;
        }
        return seenFace.current || status.simulated ? n + 1 : n;
      });
    }, 420);
    return () => window.clearInterval(t);
  }, [booting, status.simulated]);

  // A working camera pointed at no face would otherwise trap the user here
  // forever, which is exactly how a live demo dies. Offer a way past it.
  useEffect(() => {
    if (booting || status.simulated) return;
    const t = window.setTimeout(() => {
      if (!seenFace.current) setStalled(true);
    }, 12000);
    return () => window.clearTimeout(t);
  }, [booting, status.simulated]);

  const ready = revealed >= CHECKS.length || stalled;
  const rows = analysisRows(signals);

  return (
    <div className="scan">
      <div className="scan__grid">
        {/* ---------------- camera ---------------- */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="scanframe scan__frame">
            {status.cameraOk ? (
              <video ref={videoRef} className="scan__video" autoPlay muted playsInline />
            ) : (
              <div className="scan__novideo">
                <div style={{ fontSize: 46 }}>🧠</div>
                <div className="label" style={{ color: 'var(--cyan)' }}>
                  No camera feed
                </div>
                <p className="fine" style={{ maxWidth: 260, textAlign: 'center', color: '#8fa0c0' }}>
                  {status.reason ?? 'Running on generated signals.'}
                </p>
              </div>
            )}
            <FaceOverlay dotSize={1.15} every={2} />
            <span className="scanframe__corner scanframe__corner--tl" />
            <span className="scanframe__corner scanframe__corner--tr" />
            <span className="scanframe__corner scanframe__corner--bl" />
            <span className="scanframe__corner scanframe__corner--br" />
            <span className="scanframe__line" />
            <div className="scan__hud">
              <span className="scan__hudchip">
                {booting ? 'INITIALISING' : signals.present ? 'SUBJECT LOCKED' : 'SEARCHING…'}
              </span>
              <span className="scan__hudchip">
                YAW {signals.yaw.toFixed(0)}° · PITCH {signals.pitch.toFixed(0)}°
              </span>
            </div>
          </div>

          <p className="disclaimer" style={{ marginTop: 12 }}>
            <span>🔒</span>
            <span>
              Video stays on this device. Nothing is recorded or sent anywhere — the app has no
              server to send it to.
            </span>
          </p>

          <Panel title="Operator" icon="🪪">
            <label className="field">
              <span className="label">Name for the certificate</span>
              <input
                className="field__input"
                value={userName}
                maxLength={28}
                placeholder="നിങ്ങളുടെ പേര് / your name"
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && ready) setStage('desktop');
                }}
              />
            </label>
            <p className="fine" style={{ marginTop: 8 }}>
              Optional. Stored only in this browser tab, and only until you close it.
            </p>

            <button
              className="btn btn--primary"
              style={{ width: '100%', marginTop: 14 }}
              disabled={!ready}
              onClick={() => setStage('desktop')}
            >
              {ready ? (
                <>
                  <span>🚀</span>
                  <span className="ml">
                    {stalled && revealed < CHECKS.length
                      ? 'എന്നാലും തുടങ്ങാം'
                      : 'Diagnostics തുടങ്ങാം'}
                  </span>
                </>
              ) : (
                <span>Acquiring subject…</span>
              )}
            </button>
          </Panel>
        </motion.div>

        {/* ---------------- readouts ---------------- */}
        <motion.div
          className="stack"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <Panel
            title="Subject acquisition"
            icon="🔍"
            right={
              status.simulated ? (
                <Chip color="var(--magenta)">◈ Simulated</Chip>
              ) : (
                <Chip color="var(--green)">● Live</Chip>
              )
            }
          >
            <div className="checklist">
              {CHECKS.map((c, i) => (
                <motion.div
                  key={c.label}
                  className="checklist__row"
                  initial={{ opacity: 0, x: -10 }}
                  animate={i < revealed ? { opacity: 1, x: 0 } : { opacity: 0.25, x: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="checklist__label">{c.label}</span>
                  <span className="checklist__dots" />
                  <span className={`checklist__mark ${c.tone}`}>{i < revealed ? c.mark : '·'}</span>
                </motion.div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Facial analysis"
            icon="📊"
            right={<span className="fine">estimates, not measurements</span>}
          >
            <div className="stack" style={{ gap: 9 }}>
              {rows.map((r) => (
                <div key={r.label} className="analysis">
                  <span className="analysis__emoji">{r.emoji}</span>
                  <span className="analysis__label">{r.label}</span>
                  <Bar value={r.value} color={r.color} height={6} />
                  <span className="analysis__val mono" style={{ color: r.color }}>
                    {r.value.toString().padStart(2, '0')}%
                  </span>
                </div>
              ))}
            </div>
            <p className="fine" style={{ marginTop: 12 }}>
              Expression estimates from facial landmarks. They are approximate, they are not a
              reading of how anyone actually feels, and the app treats them as far more precise
              than they are — on purpose.
            </p>
          </Panel>

          {stalled && revealed < CHECKS.length && (
            <Panel title="No subject found" icon="⚠️">
              <p style={{ fontSize: 13, lineHeight: 1.65, margin: 0, color: 'var(--ink-2)' }}>
                The camera is running, but no face has turned up yet. Try more light, or move so
                your whole face is in frame.
              </p>
              <p className="fine" style={{ marginTop: 8 }}>
                You can carry on regardless — the diagnostics will simply have less to invent
                numbers from, which changes remarkably little.
              </p>
            </Panel>
          )}

          
        </motion.div>
      </div>
    </div>
  );
}
