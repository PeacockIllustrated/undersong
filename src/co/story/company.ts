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
  failed: ['Short. The Company does not accept short.'],
  audit: 'Audit day tomorrow. The Company will be counting carefully.',
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
