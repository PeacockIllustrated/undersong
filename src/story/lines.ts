// Village lines and when they are said. Story text lives here, never in UI code (golden rule 6).
export type Speaker = 'pell' | 'bram' | 'wren' | 'foreman' | 'tansy' | 'rook';

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
  tansy: 'Tansy',
  rook: 'Rook',
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
  // Holloway above (ADR-029)
  tansyArrives: {
    id: 'tansyArrives',
    who: 'tansy',
    text: 'Tansy, from down the valley. Miners dig better fed. I’ve sown you a plot east of the shaft: tap it when it’s gold.',
  },
  rookArrives: {
    id: 'rookArrives',
    who: 'rook',
    text: 'Rook. I’ve put two saplings in at the ends of the village. Fell them grown for timber, or wait, and they pay three times over.',
  },
  goldenEar: {
    id: 'goldenEar',
    who: 'tansy',
    text: 'A golden ear! Ten times the grain. My gran said they only grow where something old is sleeping.',
  },
  feast: {
    id: 'feast',
    who: 'tansy',
    text: 'Ring it again! Everyone eats, everyone digs. Twice as fast till the bread runs out.',
  },
  elder: {
    id: 'elder',
    who: 'rook',
    text: 'That one’s stood through three Cave-ins. I won’t fell it. Its roots are down in the rock now, and the rock is softer for it.',
  },
  // Act crops (ADR-030)
  cellarSeed: {
    id: 'cellarSeed',
    who: 'tansy',
    text: 'Glowcaps like the dark and the damp. Down there they’ll give Wren a spore every few breaths.',
  },
  paddy: {
    id: 'paddy',
    who: 'tansy',
    text: 'Pump water up the shaft and I’ll grow cress in it. A bowl of cress soup and the haulers carry more up the rope.',
  },
  hotbed: {
    id: 'hotbed',
    who: 'tansy',
    text: 'Firepeppers want a coal under them. Send me ember ore and the broth will keep your miners going where the rock is hot.',
  },
  helper_tansy: {
    id: 'helper_tansy',
    who: 'tansy',
    text: 'Leave the fields to me. You’ll still get double for any you reap yourself.',
  },
  helper_rook: {
    id: 'helper_rook',
    who: 'rook',
    text: 'I’ll fell them when they’re old and put a sapling in every stump.',
  },
  // Helpers (ADR-020): each takes a chore away
  helper_lamps: {
    id: 'helper_lamps',
    who: 'wren',
    text: 'Leave the lights to me and the miners. You dig.',
  },
  helper_dog: {
    id: 'helper_dog',
    who: 'pell',
    text: 'This is Biscuit. She can smell an old chest through ten feet of rock. Don’t let her eat the torches.',
  },
  tinker: {
    id: 'tinker',
    who: 'bram',
    text: 'That’s the tinker’s cart. Comes up the valley every so often. Take one thing, he says, and leave him the rest.',
  },
  curio: {
    id: 'curio',
    who: 'wren',
    text: 'Put that on the shelf with the others. Things come up from down there that remember who held them.',
  },
  rain: {
    id: 'rain',
    who: 'tansy',
    text: 'Rain! Look at the barley drink it.',
  },
  helper_pell: {
    id: 'helper_pell',
    who: 'pell',
    text: 'I’ll do the rounds! Beetles, moths, anything. I’m faster than you anyway.',
  },
  helper_pumps: {
    id: 'helper_pumps',
    who: 'bram',
    text: 'My lads will mind the pumps. Wherever the water climbs, there’ll be a pump drinking it.',
  },
  helper_props: {
    id: 'helper_props',
    who: 'bram',
    text: 'I’ll keep an eye on the roof. If it groans, there’ll be a prop under it before it drops.',
  },
  surveyOld: {
    id: 'surveyOld',
    who: 'foreman',
    text: 'The Survey Book has pages already filled in. The handwriting is mine.',
  },
  // Act IV: the Ember Deep and the Hollow Heart (M4)
  emberMeet: {
    id: 'emberMeet',
    who: 'bram',
    text: 'Basalt. Black as my forge on a Monday, and warmer. Mind your hands.',
  },
  firstEmber: {
    id: 'firstEmber',
    who: 'bram',
    text: 'Ember ore. It’s still hot when it reaches the top. I didn’t light that.',
  },
  firstGold: {
    id: 'firstGold',
    who: 'pell',
    text: 'Gold! Real gold! Bram says it’s too soft for picks. Bram says that about everything.',
  },
  tooHot: {
    id: 'tooHot',
    who: 'wren',
    text: 'The miners won’t work a face that hot, and I won’t make them. Set a cooling vent, or let water in.',
  },
  wisp: {
    id: 'wisp',
    who: 'pell',
    text: 'A cinder wisp! It sits on the hot rock and nobody can work past it. Tap it, quick.',
  },
  verse10: {
    id: 'verse10',
    who: 'wren',
    text: 'Some things are buried that never would sleep. I sang that to you when you were small. You were not small, then. You were the Foreman.',
  },
  heartMeet: {
    id: 'heartMeet',
    who: 'foreman',
    text: 'The Hollow Heart. Ropes hanging into it from shafts I never dug. Each one has our mark on the collar.',
  },
  firstHeartstone: {
    id: 'firstHeartstone',
    who: 'bram',
    text: 'It hums in the hand. Fine. I believe in songs now. Don’t tell anyone.',
  },
  verse11: {
    id: 'verse11',
    who: 'pell',
    text: 'That’s the last one. I always knew how it ended. I just never got to sing it.',
  },
  helper_vents: {
    id: 'helper_vents',
    who: 'wren',
    text: 'My people know cold the way they know dark. Show them the hot faces and get on with it.',
  },
  endless: {
    id: 'endless',
    who: 'bram',
    text: 'The floor of the Heart has given way. There’s more mountain under the mountain. Of course there is.',
  },
  newSong: {
    id: 'newSong',
    who: 'pell',
    text: 'Everyone remembers now. The verses sound different when the whole village knows them.',
  },
};
