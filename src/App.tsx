import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { Backdrop } from './components/Backdrop';
import { Notifications } from './components/Notifications';
import { AboutDialog } from './components/AboutDialog';
import { useApp } from './state/store';
import { metrics } from './state/metricsEngine';

import { BootSequence } from './stages/BootSequence';
import { Intro } from './stages/Intro';
import { FaceScan } from './stages/FaceScan';
import { Desktop } from './stages/Desktop';
import { FinalDiagnosis } from './stages/FinalDiagnosis';
import { Certificate } from './stages/Certificate';

export default function App() {
  const stage = useApp((s) => s.stage);

  useEffect(() => {
    metrics.start();
  }, []);

  return (
    <>
      <Backdrop />
      <div className="app">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            className="stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            {stage === 'boot' && <BootSequence />}
            {stage === 'intro' && <Intro />}
            {stage === 'scan' && <FaceScan />}
            {stage === 'desktop' && <Desktop />}
            {stage === 'final' && <FinalDiagnosis />}
            {stage === 'certificate' && <Certificate />}
          </motion.div>
        </AnimatePresence>
      </div>
      {stage === 'desktop' && <Notifications />}
      <AboutDialog />
    </>
  );
}
