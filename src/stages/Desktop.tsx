import { AnimatePresence, motion } from 'motion/react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { KpiRow } from '../components/KpiRow';
import { Commentary } from '../components/Commentary';
import { useApp } from '../state/store';

import { Vitals } from './panels/Vitals';
import { PinnakkManager } from './panels/PinnakkManager';
import { TaskManager } from './panels/TaskManager';
import { ProcessDialog } from './panels/ProcessDialog';
import { ReelLab } from './ReelLab';
import { BrainLab } from './brainlab/BrainLab';

const rise = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] as const },
});

function Dashboard() {
  return (
    <div className="bento">
      <motion.div className="col-12" {...rise(0)}>
        <KpiRow />
      </motion.div>
      <motion.div className="col-12" {...rise(1)}>
        <Vitals />
      </motion.div>
      <motion.div className="col-7" {...rise(2)}>
        <TaskManager />
      </motion.div>
      <motion.div className="col-5" {...rise(3)}>
        <PinnakkManager />
      </motion.div>
    </div>
  );
}

export function Desktop() {
  const view = useApp((s) => s.view);

  return (
    <div className="shell">
      <Sidebar />

      <main className="main">
        <Header />
        <div className="workspace">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              {view === 'dashboard' && <Dashboard />}
              {view === 'reels' && <ReelLab />}
              {view === 'brainlab' && <BrainLab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Commentary enabled={view === 'dashboard'} />
      <ProcessDialog />
    </div>
  );
}
