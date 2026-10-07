// M9: the lines for racing your last run and for the Cave-in's last card.

export const aheadText = (min: number): [string, string] => [
  `${min} min ahead of last cycle`,
  'Deeper than you were at this point last time',
];

export const lastCycleText = (ft: number): string => `Last cycle you reached ${ft} ft.`;

export const CEREMONY_TEXT = {
  label: 'The Cave-in',
  forget: 'The mountain settles. The village forgets.',
  echoes: 'Echoes',
  sung: 'Verses sung this cycle',
  cairn: 'A stone for the cairn',
  skip: 'Tap to go on',
  carryOn: 'Tap to carry on',
} as const;
