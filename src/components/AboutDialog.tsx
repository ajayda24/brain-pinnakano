import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../state/store';
import { useEngineStatus } from '../face/useFaceSignals';

/** The one screen in the app that is completely straight with you. */
export function AboutDialog() {
  const open = useApp((s) => s.aboutOpen);
  const close = () => useApp.getState().setAboutOpen(false);
  const status = useEngineStatus();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            className="modal__card"
            initial={{ scale: 0.94, y: 14 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__head">
              <h2 className="modal__title">About PINNAKK OS™</h2>
              <span className="panel__spacer" />
              <button className="iconbtn" onClick={close} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="panel__body about">
              <p>
                <b>This is a joke.</b> It is a parody of a diagnostic dashboard, built for a
                hackathon. Every number it shows you — പിണ്ണാക്ക് level, Brain CPU, Overthinking,
                the weight in kilograms — is invented for comedy.
              </p>
              <p>
                It does <b>not</b> measure intelligence, personality, mental health, or any medical
                or psychological condition. Please do not treat any part of it as information about
                yourself or anyone else.
              </p>
              <p>
                What is real: the app estimates facial expressions from webcam landmarks using
                MediaPipe, running <b>entirely inside your browser</b>. Frames are analysed and
                immediately discarded. Nothing is recorded, uploaded, or stored — there is no server
                behind this page.
              </p>

              <div className="about__status">
                <div className="statrow">
                  <span className="statrow__label">Camera</span>
                  <span className="statrow__dots" />
                  <span className="statrow__value mono">
                    {status.cameraOk ? 'connected' : 'not in use'}
                  </span>
                </div>
                <div className="statrow">
                  <span className="statrow__label">Face model</span>
                  <span className="statrow__dots" />
                  <span className="statrow__value mono">
                    {status.modelOk ? 'loaded locally' : 'not loaded'}
                  </span>
                </div>
                <div className="statrow">
                  <span className="statrow__label">Signal source</span>
                  <span className="statrow__dots" />
                  <span
                    className="statrow__value mono"
                    style={{ color: status.simulated ? 'var(--magenta)' : 'var(--green)' }}
                  >
                    {status.simulated ? 'simulated' : 'live camera'}
                  </span>
                </div>
                {status.reason && (
                  <p className="fine" style={{ marginTop: 8 }}>
                    {status.reason}
                  </p>
                )}
              </div>

              <button className="btn btn--ghost btn--sm" style={{ width: '100%' }} onClick={close}>
                മനസ്സിലായി
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
