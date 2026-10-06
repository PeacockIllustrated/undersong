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
  tooHard: {
    id: 'tooHard',
    who: 'bram',
    text: 'That one just bounces the pick back at you. Harder rock wants a better pick. The forge can make one.',
  },
  // Act II: Glowroot. Old Wren keeps the lamps.
  wrenMeet: {
    id: 'wrenMeet',
    who: 'wren',
    text: 'Torches drown in that damp, Foreman. Bring me iron for a Lamp-works and I’ll light you something that lasts.',
  },
  firstIron: {
    id: 'firstIron',
    who: 'bram',
    text: 'Iron. Heavier than it looks. The forge will take it, if you’re patient with her.',
  },
  firstSpores: {
    id: 'firstSpores',
    who: 'wren',
    text: 'Glowcap spores. Don’t breathe them. Bring them to me and I’ll make Lumen of them.',
  },
  built_kiln: {
    id: 'built_kiln',
    who: 'bram',
    text: 'Feed the kiln your rubble and it gives back bricks. Four bricks make a roof support.',
  },
  built_lampworks: {
    id: 'built_lampworks',
    who: 'wren',
    text: 'There. Spores in, Lumen out. A lantern drinks a little every hour it burns, so don’t hang more than you can feed.',
  },
  built_songloom: {
    id: 'built_songloom',
    who: 'pell',
    text: 'The loom hums when nobody is touching it. Bram says that’s the crystal. I don’t think it is.',
  },
  lanternsOut: {
    id: 'lanternsOut',
    who: 'wren',
    text: 'The Lumen’s gone and so are the lanterns. Spores, Foreman. Lamps don’t live on promises.',
  },
  moth: {
    id: 'moth',
    who: 'wren',
    text: 'Moths on the lanterns. They sit on the glass and drink the light. Tap them off.',
  },
  collapse: {
    id: 'collapse',
    who: 'bram',
    text: 'Roof came down! Wide rooms want holding up down here. A support from the kiln’s bricks will do it.',
  },
  verse2: {
    id: 'verse2',
    who: 'wren',
    text: 'I’ve seen that line before. On the inside of my own lamp-glass, scratched where I couldn’t have reached.',
  },
  verse3: {
    id: 'verse3',
    who: 'wren',
    text: 'Nobody planted these glowcaps. I always said so. Somebody did, though.',
  },
  verse4: {
    id: 'verse4',
    who: 'bram',
    text: 'There was a pick by that carving. Bronze, worn down to the shape of a hand. Your hand, Foreman.',
  },
  glowrootDone: {
    id: 'glowrootDone',
    who: 'wren',
    text: 'Water below. I can hear it through the stone. The lanterns won’t like it, and neither will you.',
  },
  // Act III: the Flooded Halls and the Singing Geodes. The drowned town is Holloway.
  hallsMeet: {
    id: 'hallsMeet',
    who: 'wren',
    text: 'Look down, Foreman. There are lights under the water. Windows. Somebody built a village down here.',
  },
  firstSilver: {
    id: 'firstSilver',
    who: 'bram',
    text: 'Silver. Five to a bar, same as the rest. Two bars and some iron make a pump, and a pump makes a road.',
  },
  flooded: {
    id: 'flooded',
    who: 'bram',
    text: 'The shaft is taking water. Nobody can dig standing in that. Craft a pump and set it at the water’s edge.',
  },
  pumped: {
    id: 'pumped',
    who: 'wren',
    text: 'Listen to it drink. Keep it going and we’ll see what those windows belong to.',
  },
  eel: {
    id: 'eel',
    who: 'pell',
    text: 'Something in the water bit a miner’s boot! Tap it and it lets go.',
  },
  house0: {
    id: 'house0',
    who: 'bram',
    text: 'That’s a forge. That’s my forge, Foreman. Same crack in the anvil. I’ve never been down here in my life.',
  },
  house1: {
    id: 'house1',
    who: 'wren',
    text: 'My lamp-works. My wicks, trimmed the way I trim them, and the lamp still burning. I didn’t light it. I must have.',
  },
  house2: {
    id: 'house2',
    who: 'pell',
    text: 'There’s a little bed in this one, and a carved bird on the sill. I carved that bird. I carved it last week.',
  },
  house3: {
    id: 'house3',
    who: 'foreman',
    text: 'The last house is mine. There is a Survey Book on the table, open, and every page is full.',
  },
  verse5: {
    id: 'verse5',
    who: 'wren',
    text: 'Every lit window is one we’re still keeping. So somebody kept these for us. Who keeps ours?',
  },
  verse6: {
    id: 'verse6',
    who: 'pell',
    text: 'The river carried us here. Foreman, did we come down the mountain, or up it?',
  },
  verse7: {
    id: 'verse7',
    who: 'bram',
    text: 'It’s Holloway. Holloway under the water, street for street, and older than Holloway. We’ve lived here before.',
  },
  geodesMeet: {
    id: 'geodesMeet',
    who: 'pell',
    text: 'The rocks are singing! Not humming, singing. Can you hear the words?',
  },
  firstCrystal: {
    id: 'firstCrystal',
    who: 'wren',
    text: 'Crystal that sings back. Bring twenty-five up with some silver and we can build a loom to weave the verses into it.',
  },
  golem: {
    id: 'golem',
    who: 'bram',
    text: 'The crystal got up and walked! Hit it. Hit it again. They come apart if you keep at it.',
  },
  firstCharm: {
    id: 'firstCharm',
    who: 'pell',
    text: 'It’s warm. The charm sings the verse back, in Mum’s voice. Wear it, Foreman. It helps.',
  },
  verse8: {
    id: 'verse8',
    who: 'pell',
    text: 'Sing to the stone and the stone sings it all. I did, Foreman. It sang my name back to me.',
  },
  verse9: {
    id: 'verse9',
    who: 'foreman',
    text: 'We sealed it, and slept, and woke, and came. All of us. Every cycle. Holloway is what is left each time the mountain forgets.',
  },
  geodesDone: {
    id: 'geodesDone',
    who: 'wren',
    text: 'Heat coming up through the floor. Whatever we sealed down there, we’re nearly back to it.',
  },
  surveyOld: {
    id: 'surveyOld',
    who: 'foreman',
    text: 'The Survey Book has pages already filled in. The handwriting is mine.',
  },
};
