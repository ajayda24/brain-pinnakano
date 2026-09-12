import { useState } from 'react';
import { motion } from 'motion/react';
import { Panel, PanelMenu } from '../../components/ui/primitives';
import { session } from '../../state/session';
import { DontLaugh } from './DontLaugh';
import { PokerFace } from './PokerFace';
import { HumanCaptcha } from './HumanCaptcha';
import { StareContest } from './StareContest';

type Game = 'hub' | 'dontlaugh' | 'pokerface' | 'captcha' | 'stare';

const CARDS: {
  id: Exclude<Game, 'hub'>;
  icon: string;
  title: string;
  sub: string;
  color: string;
  needsCamera: boolean;
}[] = [
  {
    id: 'dontlaugh',
    icon: '😐',
    title: "Don't Laugh",
    sub: 'Hold a neutral face for as long as you can.',
    color: 'var(--c3)',
    needsCamera: true,
  },
  {
    id: 'pokerface',
    icon: '🗿',
    title: 'Poker Face',
    sub: 'Four rounds, graded on the flicker in your face.',
    color: 'var(--c2)',
    needsCamera: true,
  },
  {
    id: 'stare',
    icon: '👁️',
    title: 'Stare Contest',
    sub: 'Do not blink. The clock stops when you do.',
    color: 'var(--c4)',
    needsCamera: true,
  },
  {
    id: 'captcha',
    icon: '🤖',
    title: 'Human Captcha',
    sub: 'Prove you are human. The bar is very low.',
    color: 'var(--c5)',
    needsCamera: false,
  },
];

function resultFor(id: Exclude<Game, 'hub'>): string | null {
  if (id === 'dontlaugh' && session.games.dontLaugh)
    return `Willpower ${session.games.dontLaugh.willpower}/100`;
  if (id === 'pokerface' && session.games.pokerFace)
    return `Score ${session.games.pokerFace.score}/100`;
  if (id === 'captcha' && session.games.captcha) return 'Verified human';
  if (id === 'stare' && session.games.stareContest)
    return `${session.games.stareContest.seconds.toFixed(1)}s without blinking`;
  return null;
}

export function BrainLab() {
  const [game, setGame] = useState<Game>('hub');
  const exit = () => setGame('hub');

  if (game === 'dontlaugh') return <DontLaugh onExit={exit} />;
  if (game === 'pokerface') return <PokerFace onExit={exit} />;
  if (game === 'captcha') return <HumanCaptcha onExit={exit} />;
  if (game === 'stare') return <StareContest onExit={exit} />;

  return (
    <div className="bento">
      <motion.div
        className="col-12"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <Panel
          title="Brain Lab"
          subtitle="Four short diagnostics"
          right={<PanelMenu />}
        >
          <p className="fine" style={{ marginBottom: 16, maxWidth: 620 }}>
            Four short tests. None of them measure anything real — they exist to make the{' '}
            <span className="ml">പിണ്ണാക്ക്</span> number move around convincingly before the final
            report.
          </p>

          <div className="lab__grid">
            {CARDS.map((c, i) => {
              const result = resultFor(c.id);
              return (
                <motion.button
                  key={c.id}
                  className="lab__card"
                  style={{ ['--c' as string]: c.color }}
                  onClick={() => setGame(c.id)}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.08 + i * 0.07 }}
                  whileHover={{ y: -3 }}
                >
                  <span className="lab__icon">{c.icon}</span>
                  <span className="lab__title">{c.title}</span>
                  <span className="lab__sub">{c.sub}</span>
                  <span className="lab__foot">
                    {result ? (
                      <span className="lab__result">✓ {result}</span>
                    ) : (
                      <span className="fine">
                        {c.needsCamera ? 'uses the camera' : 'no camera needed'}
                      </span>
                    )}
                    <span className="lab__arrow">→</span>
                  </span>
                </motion.button>
              );
            })}
          </div>
        </Panel>
      </motion.div>
    </div>
  );
}
