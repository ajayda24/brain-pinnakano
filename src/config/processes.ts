/** THALA TASK MANAGER — the process table. */

export interface ProcessDef {
  id: string;
  name: string;
  /** resting CPU %, before live signals push it around */
  cpu: number;
  ram: number;
  since: string;
  /** which live signal drives this process's CPU */
  driver?: 'smile' | 'laugh' | 'confusion' | 'idle' | 'gaze' | 'reel' | 'motion';
  /** only ActualWork.exe can actually be ended, and you should not */
  killable?: boolean;
  /** in-character refusal when END TASK is pressed */
  refusal: string;
  status?: string;
  /** spawned at runtime rather than present from boot */
  transient?: boolean;
}

export const BASE_PROCESSES: ProcessDef[] = [
  {
    id: 'verute',
    name: 'വെറുതെ ഇരിക്കൽ.exe',
    cpu: 34,
    ram: 2.1,
    since: 'Boot',
    driver: 'idle',
    refusal: 'This is a core system process. Ending it would end you.',
  },
  {
    id: 'chumma',
    name: 'ചുമ്മാ ആലോചിക്കൽ.exe',
    cpu: 27,
    ram: 4.4,
    since: 'Boot',
    driver: 'confusion',
    refusal: 'ചുമ്മാ ആലോചിക്കൽ cannot be stopped. It stops you.',
  },
  {
    id: 'naanakkedu',
    name: 'പഴയ നാണക്കേട്.exe',
    cpu: 19,
    ram: 3.2,
    since: '2017',
    refusal: 'This memory cannot be deleted.',
    status: 'Permanently installed',
  },
  {
    id: 'chaya',
    name: 'ചായ വേണം.exe',
    cpu: 12,
    ram: 0.6,
    since: '04:30 PM',
    refusal: 'Denied. ചായ is not optional.',
  },
  {
    id: 'reel',
    name: 'റീൽ കാണൽ.exe',
    cpu: 41,
    ram: 6.8,
    since: 'Boot',
    driver: 'reel',
    refusal: 'Process restarted itself before the dialog finished rendering.',
  },
  {
    id: 'overthinking',
    name: 'Overthinking.exe',
    cpu: 67,
    ram: 11.9,
    since: 'Age 14',
    driver: 'confusion',
    refusal: 'Ending this process spawned four more. Aborting.',
  },
  {
    id: 'actualwork',
    name: 'ActualWork.exe',
    cpu: 2,
    ram: 0.2,
    since: 'Never, really',
    killable: true,
    refusal: '',
    status: 'Barely running',
  },
  {
    id: 'pinnakk',
    name: 'Pinnakk.exe',
    cpu: 89,
    ram: 14.2,
    since: 'Birth',
    refusal: 'ഇത് നിർത്താൻ പറ്റില്ല. ഇത് തന്നെയാണ് നിങ്ങൾ.',
    status: 'System critical',
  },
  {
    id: 'human',
    name: 'Human.exe',
    cpu: 8,
    ram: 1.4,
    since: 'Boot',
    driver: 'idle',
    refusal: 'You cannot end Human.exe from inside Human.exe.',
    status: 'Running',
  },
  {
    id: 'focus',
    name: 'Focus.exe',
    cpu: 23,
    ram: 0.9,
    since: 'Boot',
    driver: 'gaze',
    refusal: 'Focus.exe has already crashed on its own. Nothing to end.',
  },
];

/** Spawned in response to live events, then retired. */
export const TRANSIENT_PROCESSES: Record<string, ProcessDef> = {
  laughing: {
    id: 'laughing',
    name: 'Laughing.exe',
    cpu: 58,
    ram: 5.1,
    since: 'Just now',
    driver: 'laugh',
    transient: true,
    refusal: 'Let it finish. It is the only good process here.',
  },
  happiness: {
    id: 'happiness',
    name: 'HAPPINESS.EXE',
    cpu: 31,
    ram: 2.2,
    since: 'Just now',
    driver: 'smile',
    transient: true,
    refusal: 'Why would you.',
  },
  nostalgia: {
    id: 'nostalgia',
    name: 'പഴയ കാര്യം.exe',
    cpu: 44,
    ram: 7.7,
    since: 'Suddenly',
    transient: true,
    refusal: 'Too late. You are already thinking about it.',
  },
};

export const END_TASK_STEPS = ['Ending process...', 'Ending...', 'Still ending...'];
