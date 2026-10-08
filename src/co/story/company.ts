// Holloway & Co.: the Company's words and the village's. New text for the hybrid (ADR-H007); verses stay canon §3.

export const TITLE = {
  name: 'Holloway & Co.',
  line: 'The Company has bought the mountain.',
  pitch: [
    'Every day, fill the coal quota before dusk.',
    'Every night, the mountain heals and forgets.',
    'Miss a quota and the roof comes down.',
  ],
  sign: 'Sign the contract',
} as const;

/** The Tallyman reads the tally at dusk. One line per outcome, picked by the day. */
export const TALLY_LINES = {
  passed: [
    'The Company is satisfied. For today.',
    'A fair tally. Tomorrow will want more.',
    'Coal received. The quota rises at dawn.',
    'Good. The Company remembers good days. Briefly.',
  ],
  pardoned: ['Short. The Union card covers you this once.'],
  failed: [
    'Short. The Company does not accept short.',
    'Short. The Tallyman closes the ledger without looking up.',
    'Short. Somewhere above, a pen scratches a line through Holloway.',
  ],
  audit: 'Audit day tomorrow. The Company will be counting carefully.',
  /** The Tallyman's word for a graded shift (ADR-H008). */
  graded: {
    'Good shift': [
      'Good. The Company has noted it. In pencil.',
      'A good shift. Do not let it become a habit.',
    ],
    'Bumper shift': [
      'A bumper shift. The Company wonders what you were holding back.',
      'Double the quota. The Company will remember this number tomorrow.',
    ],
    'Record shift': [
      'A record. The Tallyman writes it down twice, to be sure.',
      'Three times the quota. Somewhere a shareholder smiles and does not know why.',
    ],
  } as Record<string, readonly string[]>,
  /** Lines for a streak of met quotas. */
  streak: [
    'Another day, another quota met. The Company is starting to expect it.',
    'The Tallyman has stopped saying well done. It is assumed now.',
  ],
} as const;

/** What the Tallyman says to each Foreman when the contract is signed. */
export const FOREMAN_INTROS: Record<string, string> = {
  apprentice: 'The Tallyman looks you up and down. "They are sending children now."',
  smith: '"The smith. Mind the Company’s charges; they are on your account."',
  lamplighter: '"Old Wren. The Company does not pay for light. It pays for coal."',
  fieldhand: '"A farmer. The Company hopes you dig as well as you carry."',
  woodcutter: '"An axe in a coal pit. Very well. The props are your own lookout."',
  doghandler: '"No dogs on the ledger. Feed it from your own scrip."',
  lone: '"Alone? The Company admires a lean payroll."',
  stoker: '"You like the heat. Good. The deep has plenty of it."',
};

/** What the Tallyman says about the ground a contract is signed on. */
export const SEAM_INTROS: Record<string, string> = {
  openCut: 'The Open Cut. Plain ground and an honest quota.',
  drowned: 'The Drowned Street. The water comes up every afternoon. Be out of the funnel by then.',
  geode: 'The Hanging Geode. The shaft drops into the bowl. Look up.',
  workings: 'The Old Workings. Somebody dug here before you. They left in a hurry.',
  chimney: 'The Ember Chimney. Short days and double pay. Take the cold lance down.',
  heart:
    'The Hollow Heart. The Company has never sent anyone this deep and had them come back to sign twice.',
};

/** The two endings (H7). Verse XII is canon; the Company's words are new (ADR-H007). */
export const ENDINGS = {
  ask: 'Verse XII is in the rock. The Company wants the Heart. The song wants to be sung.',
  quota: {
    title: 'Fill the Last Quota',
    line: 'Sign the Endless Contract. Quotas without end, for as long as you can keep up.',
    after:
      'The Tallyman smiles for the first time. "Then there is no last quota." The contract does not end. The quota grows faster.',
  },
  song: {
    title: 'Sing the Last Verse',
    line: 'Break the contract. The roof comes down, the Company with it, and the village begins again: New Song+.',
    after: 'The song carries up the shaft. The ledger burns. Holloway keeps every Echo, three times over.',
  },
} as const;

export const CAVEIN = {
  title: 'The roof came down',
  line: 'The contract is over. The village keeps what the stone cannot take.',
  book: 'The Survey Book',
  bookLine: 'Echoes spent here help every contract after this one.',
  again: 'Sign a new contract',
} as const;

export const CONTROLS: readonly [string, string][] = [
  ['A  D', 'Run'],
  ['W  or  Space', 'Jump, climb ladders, fly'],
  ['S', 'Climb down'],
  ['Mouse', 'Aim'],
  ['Hold left click', 'Dig'],
  ['Right click  or  E', 'Throw a blast charge'],
  ['F', 'Drop a ladder'],
  ['G', 'Drop a platform (S to drop through)'],
  ['1 to 5  or  wheel', 'Swap tools'],
  ['Esc', 'Pause'],
];

export const HINTS = {
  first: 'Dig the black coal, then carry it up to the kibble by the headframe.',
  kibble: 'Stand by the kibble to tip your pack in.',
} as const;

/** The night screen's new corners (ADR-H008, ADR-H009). */
export const NIGHT = {
  stock: 'Ore in the store room',
  stockEmpty: 'No ore banked yet. Dig the coloured veins and tip them in at the kibble.',
  tinker: "The tinker's cart",
  tinkerLine: 'A cart at the pithead after dark. Nobody asks where she finds them.',
  tinkerEmpty: 'Sold out for tonight.',
  reroll: 'Turn the cart out',
  singTitle: 'Sing it down',
  singLine: 'End the contract tonight and take the Echoes.',
  singAsk: 'Bring the roof down on purpose? The contract ends and the village keeps the Echoes.',
  singYes: 'Sing it down',
  singNo: 'Not tonight',
  heart: 'each heartstone still banked adds an Echo',
} as const;

/** The signing table: who leads the contract, and where (H4, H5). */
export const SIGNING = {
  title: 'Sign a contract',
  foreman: 'Who leads it',
  seam: 'Where',
  locked: 'Locked',
  song: 'The song so far',
  songEmpty: 'No verses found yet. They are carved into the rock, deeper each band.',
} as const;

/** How an unlock reads on a locked card. */
export function unlockText(u: { kind: string; n?: number; id?: string }): string {
  switch (u.kind) {
    case 'contracts':
      return `After ${u.n} Cave-in${u.n === 1 ? '' : 's'}`;
    case 'bestDay':
      return `Reach day ${u.n}`;
    case 'verses':
      return `Find ${u.n} verses`;
    case 'badge':
      return u.id === 'fm:apprentice' ? 'Survive day 15 as the Apprentice' : 'Earn a badge';
    default:
      return '';
  }
}
