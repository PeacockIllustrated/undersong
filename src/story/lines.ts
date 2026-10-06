// Village lines and when they are said. Story text lives here, never in UI code (golden rule 6).
export type Speaker = 'pell' | 'bram' | 'wren' | 'foreman';

export interface Line {
  id: string;
  who: Speaker;
  text: string;
}

export const SPEAKER_NAME: Record<Speaker, string> = {
  pell: 'Pell',
  bram: 'Bram',
  wren: 'Old Wren',
  foreman: 'the Foreman',
};

export const LINES: Record<string, Line> = {
  intro: {
    id: 'intro',
    who: 'pell',
    text: 'Foreman! The old shaft is open again. Bram says there’s copper under the grass.',
  },
  introAgain: {
    id: 'introAgain',
    who: 'pell',
    text: 'Foreman? I had the strangest dream. We were digging, and then we weren’t. Why is the shaft open?',
  },
  firstOre: {
    id: 'firstOre',
    who: 'bram',
    text: 'Copper. Bring the forge five of those and it’ll give you a bar.',
  },
  firstBar: {
    id: 'firstBar',
    who: 'bram',
    text: 'There’s your first bar. Ten buys a proper pick. Fifteen buys a pair of hands from the bunkhouse.',
  },
  firstMiner: {
    id: 'firstMiner',
    who: 'pell',
    text: 'The new miner says the dark down there hums. I told him that’s just the mountain.',
  },
  darkMiners: {
    id: 'darkMiners',
    who: 'bram',
    text: 'Your miners are working blind. A torch or two by the face and they’ll dig twice as fast.',
  },
  beetle: {
    id: 'beetle',
    who: 'pell',
    text: 'Beetles! They nest where it’s dark. Tap them and they scuttle off.',
  },
  chest: {
    id: 'chest',
    who: 'bram',
    text: 'Someone left this down there. Someone who ties their knots the way I do.',
  },
  verse0: {
    id: 'verse0',
    who: 'pell',
    text: 'I know that one. Mum used to hum it to me. Why is it written in the rock?',
  },
  verse1: {
    id: 'verse1',
    who: 'bram',
    text: 'Same hand as the first. It’s older than the village, and the village is old.',
  },
  rush: {
    id: 'rush',
    who: 'bram',
    text: 'That’s it, follow the vein! Keep your pick on the copper and it comes easier.',
  },
  depth150: { id: 'depth150', who: 'pell', text: 'It glows down there, Foreman. Blue, like in the stories.' },
  caveInReady: {
    id: 'caveInReady',
    who: 'bram',
    text: 'Hear that? The timbers. The whole hill wants to settle. When it goes we start again. We always do.',
  },
  surveyOld: {
    id: 'surveyOld',
    who: 'foreman',
    text: 'The Survey Book has pages already filled in. The handwriting is mine.',
  },
};
