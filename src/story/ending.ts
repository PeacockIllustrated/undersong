// The ending (canon §3): the choice at the Hollow Heart, and the scene each choice plays.
// Story text lives here, never in UI code (golden rule 6).

export const CHOICE = {
  title: 'The Hollow Heart',
  intro:
    'Twelve verses, and the Heart is humming all of them. The ropes of every Foreman before you hang in the dark. The village is waiting at the top of the shaft for you to say what happens now.',
  seal: {
    label: 'Seal the shaft',
    text: 'Let Holloway forget one last time. The cycle goes on, gently, and the mountain keeps going down.',
    unlocks: 'Unlocks Endless Depth below the Heart.',
  },
  sing: {
    label: 'Sing the last verse',
    text: 'Sing it all the way through, and let Holloway remember every cycle at once.',
    unlocks: 'Unlocks New Song+: the verses come back sung, and every Cave-in pays more Echoes.',
  },
};

export const SCENES: Record<'seal' | 'sing', { title: string; lines: string[]; button: string }> = {
  seal: {
    title: 'The shaft is sealed',
    lines: [
      'You climb the old ropes one last time and let the collar fall in behind you.',
      'Pell stops humming halfway through a verse and can’t remember the rest.',
      'Bram says the mountain looks taller this morning. Wren lights the lamps.',
      'Somewhere far below, the Heart goes on singing to nobody. The floor under it gives way.',
    ],
    button: 'Begin again',
  },
  sing: {
    title: 'The last verse',
    lines: [
      'Here is the heart, and the heart is a song; sing it, remember, you’ve known it all along.',
      'Every cycle comes back at once: every shaft, every Foreman, every lamp in every window.',
      'Wren is crying. Bram is singing, badly. Pell knew all the words.',
      'The mountain opens over Holloway, and for the first time the village can see the sky from the bottom of the shaft.',
    ],
    button: 'Begin the New Song',
  },
};

/** New Song+: a verse comes back sung, its lines the other way round. */
export const SUNG_BACK = 'Sung back by the whole of Holloway.';

/** What the Survey Book says once an ending has been chosen. */
export const ENDING_NOTE = {
  songs: (n: number, per: number): string =>
    `The last verse has been sung ${n === 1 ? 'once' : `${n} times`}: every Cave-in pays ${Math.round(n * per * 100)}% more Echoes.`,
  endless: 'The shaft was sealed, and the floor of the Heart goes on down.',
};
