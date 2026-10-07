"""Holloway & Co. sprites for H2 to H8: crew roles, the Company, the Foremen, tools, movement gear, gems,
relics and the props the plan calls for. Run from tools/art: `python3 hybrid.py`. Master palette only."""
from lib import *

# the character helpers from chars.py, without re-running its writes
_src = open(__file__.replace('hybrid.py', 'chars.py')).read().split('fore=body()')[0]
exec(_src.replace('from lib import *', ''))


def art(rows, w=16, h=16, floor=False):
    """A hand-drawn grid, padded to w x h with transparent pixels (below it, or above it when it sits on the floor)."""
    assert len(rows) <= h and all(len(r) <= w for r in rows), rows
    rows = [r.ljust(w, '.') for r in rows]
    pad = ['.' * w] * (h - len(rows))
    return from_rows(pad + rows if floor else rows + pad)


def tool(base, frames3, legs=('l', 'm')):
    """The 9-frame crew layout (idle 1-2, work 3-5, walk 6-9) from a body and three work frames."""
    return [base, idle2(base)] + frames3 + [walk(base, i, legs=legs) for i in range(4)]


def held(c, rows, x, y):
    d = c.copy()
    d.grid(x, y, rows)
    return d


# ---------------------------------------------------------------- crew roles (H2)
# Hewer: the plain miner (chars/miner) digs the face; no new sprite.

# Putter: hauls coal to the kibble with a sack on the back and a shovel.
put = body(hat='cap', hatc=('b', 'c', 'd'), shirt=('h', 'g'), legs=('l', 'm'))
put.grid(1, 9, ['.ss.', 'sNNs', 'sNNs', 'sNNs', '.ss.'])  # coal sack on the back
shovel = [with_pick(put, a, head=('u', 't'), handle='b') for a in range(3)]
write('chars', 'putter', tool(put, shovel), anchor=(8, 23), comment='frames: idle 1-2, shovel 3-5, walk 6-9')

# Shotfirer: red helmet, a charge in the hand, throws it.
sf = body(hat='helmet', hatc=('R', 'S', 'z'), shirt=('R', 'S'), legs=('l', 'm'))
sf_throw = []
for i, (x, y) in enumerate(((11, 7), (13, 3), (14, 9))):
    f = sf.copy()
    f.grid(x, y, ['.Y', 'RS', 'RS'])
    sf_throw.append(f)
write('chars', 'shotfirer', tool(sf, sf_throw), anchor=(8, 23), comment='frames: idle 1-2, throw 3-5, walk 6-9')

# Lampman: lamp on a pole; the work frames swing the lamp so the light moves.
lm = body(hat='cap', hatc=('s', 't', 'u'), shirt=('y', 'o'), legs=('l', 'm'))
lamps = []
for dx in (0, 1, 0):
    f = lm.copy()
    f.vline(13, 6, 13, 'b')
    f.grid(12 + dx, 2, ['.a.', 'aYa', 'aza', '.a.'])
    lamps.append(f)
lm_base = lamps[0].copy()
write('chars', 'lampman', tool(lm_base, lamps), anchor=(8, 23), comment='frames: idle 1-2, lamp 3-5, walk 6-9')

# Pumpman: blue overalls and a big wrench, works a pump handle.
pm = body(hat='cap', hatc=('C', 'D', 'E'), shirt=('C', 'D'), legs=('C', 'G'))
pump = []
for y in (9, 11, 13):
    f = pm.copy()
    f.grid(11, y, ['vv.v', '.vvv', '..t.', '..t.'])
    pump.append(f)
write('chars', 'pumpman', tool(pm, pump, legs=('C', 'G')), anchor=(8, 23), comment='frames: idle 1-2, wrench 3-5, walk 6-9')

# Deputy: white helmet with a gold band, a tally board, points the gang on.
dp = body(hat='helmet', hatc=('v', 'W', 'Y'), shirt=('l', 'm'), legs=('a', 'b'))
dp.px(4, 12, 'Y')  # armband
board = ['ddd', 'dWd', 'dWd', 'ddd']
point = []
for i in range(3):
    f = dp.copy()
    f.grid(12, 11, board)
    if i == 1:
        f.hline(12, 14, 9, 'q')
    if i == 2:
        f.hline(12, 15, 10, 'q')
    point.append(f)
write('chars', 'deputy', tool(dp, point, legs=('a', 'b')), anchor=(8, 23), comment='frames: idle 1-2, point 3-5, walk 6-9')

# Overman: bowler hat and a long coat; runs the day while you are away.
ov = body(hat='cap', hatc=('a', 'N', 'k'), shirt=('a', 'b'), legs=('k', 'l'))
ov.hline(5, 10, 3, 'N'); ov.hline(6, 9, 2, 'N'); ov.hline(6, 9, 1, 'N')  # crown of the bowler
ov.rect(4, 16, 8, 3, 'a')  # coat tails
ov.px(7, 11, 'Y')  # watch chain
watch = []
for i in range(3):
    f = ov.copy()
    f.grid(12, 11, ['.Y.', 'YzY', '.Y.'] if i != 1 else ['.Y.', 'YWY', '.Y.'])
    watch.append(f)
write('chars', 'overman', tool(ov, watch, legs=('k', 'l')), anchor=(8, 23), comment='frames: idle 1-2, pocket watch 3-5, walk 6-9')

# Agent: top hat and a grey suit; the late-game multiplier, mostly stands about.
ag = body(hat='cap', hatc=('N', 'N', 'k'), shirt=('t', 'u'), legs=('s', 't'))
ag.rect(6, 0, 4, 3, 'N'); ag.hline(4, 11, 3, 'N'); ag.hline(6, 9, 2, 'R')  # top hat with a band
ag.px(8, 11, 'R')  # tie
cane = []
for i in range(3):
    f = ag.copy()
    f.vline(13, 13, 22, 'a'); f.px(13, 12, 'Y')
    if i == 1:
        f.px(12, 12, 'Y')
    cane.append(f)
write('chars', 'agent', tool(ag, cane, legs=('s', 't')), anchor=(8, 23), comment='frames: idle 1-2, cane 3-5, walk 6-9')

# ---------------------------------------------------------------- the Company (H7)
# The Tallyman: tall, thin, top hat, ledger under the arm, reads the tally at dusk.
tm = body(hat='cap', hatc=('N', 'N', 'k'), shirt=('N', 'k'), legs=('N', 'k'), skin=('q', 'd'))
tm.hline(6, 9, 7, 'v')  # spectacles
tm.rect(6, 0, 4, 3, 'N'); tm.hline(4, 11, 3, 'N'); tm.hline(6, 9, 2, 'S')
tm.px(8, 7, 'Y')  # spectacle glint
tm.grid(11, 11, ['RRR', 'RzR', 'RzR', 'RRR'])  # the ledger
tm2 = tm.copy(); tm2.grid(11, 10, ['RRRR', 'RzWR', 'RzWR', 'RRRR'])  # ledger open
tm3 = tm.copy(); tm3.grid(11, 11, ['RRR', 'RzR', 'RzR', 'RRR']); tm3.line(13, 9, 15, 6, 'a'); tm3.px(15, 5, 'W')  # pen raised
write('chars', 'tallyman', [tm, idle2(tm), tm2, tm3], anchor=(8, 23), comment='frames: idle 1-2, open ledger 3, write 4')

# ---------------------------------------------------------------- Foremen (H4, H5)
# The Apprentice: a short Foreman in a too-big helmet.
ap = body(hat='helmet', hatc=('y', 'Y', 'z'), shirt=('h', 'g'), legs=('l', 'm'), short=True)
write('chars', 'apprentice', [ap, idle2(ap), with_pick(ap, 0), with_pick(ap, 1), with_pick(ap, 2)] + [walk(ap, i) for i in range(4)],
      anchor=(8, 23), comment='frames: idle 1-2, swing 3-5, walk 6-9')
# The Lone Foreman: a scarf and no crew.
lf = body(hat='helmet', hatc=('s', 't', 'z'), shirt=('k', 'l'), legs=('a', 'b'))
lf.hline(4, 11, 10, 'S'); lf.vline(3, 10, 13, 'S'); lf.px(2, 13, 'R')
write('chars', 'lone-foreman', [lf, idle2(lf), with_pick(lf, 0), with_pick(lf, 1), with_pick(lf, 2)] + [walk(lf, i, legs=('a', 'b')) for i in range(4)],
      anchor=(8, 23), comment='frames: idle 1-2, swing 3-5, walk 6-9')
# The Stoker: goggles, a leather apron, an ember glow on the hands.
st = body(hat='bald', hair='a', shirt=('R', 'S'), legs=('a', 'b'), apron='b')
st.hline(5, 10, 6, 'a'); st.px(7, 6, 'T'); st.px(9, 6, 'T')  # goggles
st.px(12, 13, 'T'); st.px(3, 13, 'T')
write('chars', 'stoker', [st, idle2(st), with_pick(st, 0, head=('T', 'S')), with_pick(st, 1, head=('T', 'S')), with_pick(st, 2, head=('T', 'S'))] + [walk(st, i, legs=('a', 'b')) for i in range(4)],
      anchor=(8, 23), comment='frames: idle 1-2, swing 3-5, walk 6-9')

# ---------------------------------------------------------------- tools (H3, H5)
write('items', 'scatter-pick', [art([
    '................',
    '....S...S...S...',
    '....TS..TS..TS..',
    '.....TSSTSSST...',
    '......RSSSSR....',
    '.........cb.....',
    '........cb......',
    '.......cb.......',
    '......cb........',
    '.....cb.........',
    '....cb..........',
    '...cb...........',
    '..cb............',
    '................',
])])
write('items', 'charge', [art([
    '...........z....',
    '..........Y.Y...',
    '...........T....',
    '..........a.....',
    '.........a......',
    '..TSSaSSSSaSR...',
    '..RRRaRRRRaRR...',
    '..TSSaSSSSaSR...',
    '..RRRaRRRRaRR...',
    '..TSSaSSSSaSR...',
    '..RRRaRRRRaRR...',
])])
mort = Cv(16, 16)
mort.rect(2, 12, 12, 2, 's'); mort.hline(3, 12, 11, 't')  # base plate
for i in range(7):
    mort.rect(5 + i, 9 - i, 3, 2, 't')
    mort.px(5 + i, 9 - i, 'v')
mort.rect(12, 1, 3, 2, 's'); mort.px(13, 1, 'N')  # muzzle
mort.line(6, 10, 4, 13, 'a'); mort.line(9, 8, 11, 13, 'a')  # legs
write('items', 'mortar', [mort])
write('items', 'mortar-shell', [art([
    '................',
    '......vv........',
    '.....vuuv.......',
    '.....uttu.......',
    '.....tSSt.......',
    '.....tttt.......',
    '.....tSSt.......',
    '.....tttt.......',
    '.....tttt.......',
    '....sssss.......',
    '....s.s.s.......',
])])
lance = Cv(16, 16)
lance.line(2, 14, 11, 5, 'b'); lance.line(3, 14, 12, 5, 'c')
lance.grid(10, 1, ['.JJ.', 'JHHJ', 'HGGH', '.HH.', '.ss.'])
lance.px(15, 1, 'E'); lance.px(14, 0, 'W'); lance.px(9, 1, 'E')
write('items', 'cold-lance', [lance])
write('items', 'axe', [art([
    '................',
    '.........vv.....',
    '........vuuv....',
    '.......vuuuv....',
    '......vuuuuv....',
    '......vuucuW....',
    '.......vccvW....',
    '.......cb.......',
    '......cb........',
    '.....cb.........',
    '....cb..........',
    '...cb...........',
    '..cb............',
    '................',
])])
# the drill rig: placed in the mine, digs straight down (two frames turn the bit)
rig = []
for f in range(2):
    c = Cv(16, 24)
    c.rect(3, 1, 10, 2, 'y'); c.hline(3, 12, 1, 'Y')  # top beam
    c.vline(3, 1, 13, 't'); c.vline(12, 1, 13, 't')  # frame
    c.rect(5, 4, 6, 6, 's'); c.rect(6, 5, 4, 4, 't'); c.px(7, 6, 'S'); c.px(8, 6, 'T')  # motor
    c.hline(2, 13, 13, 'b'); c.hline(2, 13, 14, 'a')  # skid
    c.vline(7, 10, 15, 'v'); c.vline(8, 10, 15, 'u')
    for y in range(16, 23):
        w = max(0, (22 - y) // 2)
        c.hline(8 - w - 1, 8 + w, y, 'u' if (y + f) % 2 else 'v')
    c.px(7, 23, 'v')
    rig.append(c)
write('objects', 'drill-rig', rig, anchor=(8, 13), comment='frames: bit turning 1-2')

# ---------------------------------------------------------------- movement gear (H6)
write('items', 'pit-boots', [art([
    '................',
    '................',
    '.....bbbb.......',
    '.....bccb.......',
    '.....bccb.......',
    '.....bccb.......',
    '.....bccbbb.....',
    '....abcccccbb...',
    '....abccccccdb..',
    '....aaaaaaaaaaa.',
    '....s.s.s.s.s...',
])])
write('items', 'feather', [art([
    '................',
    '...........WW...',
    '..........WEW...',
    '.........WEEW...',
    '........WEEDW...',
    '.......WEEDW....',
    '......WEEDW.....',
    '.....WEEDW......',
    '.....WEDW.......',
    '....WEDW........',
    '....WDW.........',
    '...vWW..........',
    '..v.............',
    '.v..............',
])])
write('items', 'wings', [art([
    '................',
    '.WW..........WW.',
    '.WEW........WEW.',
    '.WEEW......WEEW.',
    '..WEEW.yy.WEEW..',
    '..WDEEWyyWEEDW..',
    '...WDEEyyEEDW...',
    '...WWDDyyDDWW...',
    '....WWDyyDWW....',
    '......WyyW......',
    '.......yy.......',
])])
write('items', 'jetpack', [art([
    '................',
    '....vv....vv....',
    '...vuuv..vuuv...',
    '...uttuvvuttu...',
    '...uttu..uttu...',
    '...uSSuyyuSSu...',
    '...uttuyyuttu...',
    '...uttu..uttu...',
    '...sttsssstts...',
    '....ss....ss....',
    '....TT....TT....',
    '...TYYT..TYYT...',
    '....Yz....Yz....',
    '.....z.....z....',
])])

# ---------------------------------------------------------------- the Company's paper and money (H1 to H4)
write('items', 'scrip', [art([
    '................',
    '................',
    '..iiiiiiiiiii...',
    '..ihhhhhhhhhi...',
    '..ih.ggggg.hi...',
    '..ihg.hhh.ghi...',
    '..ihg.h.h.ghi...',
    '..ihg.hhh.ghi...',
    '..ih.ggggg.hi...',
    '..ihhhhhhhhhi...',
    '..iiiiiiiiiii...',
])])
write('items', 'contract', [art([
    '................',
    '...zzzzzzzzz....',
    '...zWWWWWWWWz...',
    '...zWmmmmmWWz...',
    '...zWWWWWWWWz...',
    '...zWnnnnnnWz...',
    '...zWnnnnnWWz...',
    '...zWnnnnnnWz...',
    '...zWWWWWWWWz...',
    '...zWnnnWWWWz...',
    '...zWWWWWRRWz...',
    '...zWWWWRSSRz...',
    '...zzzzzzRRzz...',
])])
write('items', 'tally-sheet', [art([
    '................',
    '.....aaaaa......',
    '...ddaYYYaddd...',
    '...dWWWWWWWWd...',
    '...dWn.n.n.Wd...',
    '...dWnnnnnnWd...',
    '...dWn.n.n.Wd...',
    '...dWWWWWWWWd...',
    '...dWRR.RR.Wd...',
    '...dWW.R.RRWd...',
    '...dWRR.RR.Wd...',
    '...dWWWWWWWWd...',
    '...dddddddddd...',
])])
write('items', 'union-card', [art([
    '................',
    '................',
    '.RRRRRRRRRRRRR..',
    '.RSSSSSSSSSSSR..',
    '.RSWWSSSzzzzSR..',
    '.RSWWSSSSSSSSR..',
    '.RSSSSSSzzzSSR..',
    '.RSzzzzzSSSSSR..',
    '.RSSSSSSSSSSSR..',
    '.RRRRRRRRRRRRR..',
])])
write('items', 'badge', [art([
    '................',
    '.....RR.CC......',
    '.....RR.CC......',
    '......RRCC......',
    '.......RC.......',
    '......yyyy......',
    '.....yYYYYy.....',
    '....yYzYYzYy....',
    '....yYYzzYYy....',
    '....yYzYYzYy....',
    '.....yYYYYy.....',
    '......yyyy......',
])])
write('items', 'kibble', [art([
    '................',
    '.......vv.......',
    '......v..v......',
    '.....v....v.....',
    '..ssssssssssss..',
    '..stttttttttts..',
    '...sNNNNNNNNs...',
    '...stttttttts...',
    '...stuttttuts...',
    '....sttttttss...',
    '....stuttuts....',
    '.....ssssss.....',
])])
write('items', 'quota-coal', [art([
    '................',
    '................',
    '......skt.......',
    '....sskttks.....',
    '...skkttkkts....',
    '..skvkkskNkks...',
    '..sNkksNkktNs...',
    '.skkNkvtsNkkks..',
    '.sNkkkNkkkNkNs..',
    '..sssssssssss...',
])])

# ---------------------------------------------------------------- gems from deep chests (H3)
GEM = ['......xx......', '.....xyyx.....', '....xyzyyx....', '...xyzyyyyx...', '...xyyyyyyx...',
       '....xyyyyx....', '.....xyyx.....', '......xx......']
for name, (dark, mid, light) in {'ruby': ('R', 'S', 'T'), 'sapphire': ('C', 'D', 'E'), 'emerald': ('g', 'i', 'J'),
                                 'moonstone': ('n', 'v', 'W'), 'diamond': ('v', 'E', 'W'), 'topaz': ('o', 'p', 'z')}.items():
    rows = ['', '', '', ''] + [r.replace('x', dark).replace('y', mid).replace('z', light).center(16, '.') for r in GEM]
    write('items', f'gem-{name}', [art(rows)])

# ---------------------------------------------------------------- relics (H3), one per villager
write('items', 'relic-wick', [art([
    '................',
    '.......Y........',
    '......YzY.......',
    '......YzY.......',
    '.......T........',
    '.......a........',
    '......WWW.......',
    '......WEW.......',
    '......WWW.......',
    '......WEW.......',
    '......WWW.......',
    '.....yyyyy......',
    '....yYYYYYy.....',
])])
write('items', 'relic-ring', [art([
    '................',
    '................',
    '......RR........',
    '.....RTTR.......',
    '......RR........',
    '....yyyyyy......',
    '...yY....Yy.....',
    '..yY......Yy....',
    '..y........y....',
    '..y........y....',
    '..yY......Yy....',
    '...yY....Yy.....',
    '....yyyyyy......',
])])
write('items', 'relic-button', [art([
    '................',
    '................',
    '.....pppppp.....',
    '....pqqqqqqp....',
    '...pqqoqqoqqp...',
    '...pqoaqqaoqp...',
    '...pqqoqqoqqp...',
    '...pqqqqqqqqp...',
    '...pqqoqqoqqp...',
    '...pqoaqqaoqp...',
    '...pqqoqqoqqp...',
    '....pqqqqqqp....',
    '.....pppppp.....',
])])
write('items', 'relic-flask', [art([
    '................',
    '......bb........',
    '......cc........',
    '......vv........',
    '.....vEEv.......',
    '....vEWEEv......',
    '...vEEEEEEv.....',
    '...vihhhhiv.....',
    '...vhhihhhv.....',
    '...vhhhhihv.....',
    '....vhhhhv......',
    '.....vvvv.......',
])])
write('items', 'relic-collar', [art([
    '................',
    '................',
    '.....RRRRRR.....',
    '...RRSSSSSSRR...',
    '..RSS......SSR..',
    '..RS........SR..',
    '..RS........SR..',
    '..RSS......SSR..',
    '...RRSSSSSSRR...',
    '.....RRYRRR.....',
    '.......Y........',
    '......YzY.......',
    '.......Y........',
])])
write('items', 'relic-pen', [art([
    '................',
    '............WW..',
    '...........WEW..',
    '..........WEW...',
    '.........WEW....',
    '........WEW.....',
    '.......NaW......',
    '......NaN.......',
    '.....NaN........',
    '....YaN.........',
    '...Ya...........',
    '..Y.............',
    '.N..............',
])])
write('items', 'relic-boots', [art([
    '................',
    '....gg..........',
    '....gh..........',
    '....gh....gg....',
    '....gh....gh....',
    '....ghgg..gh....',
    '...aghhhg.ghgg..',
    '...aaaaaa.ghhhg.',
    '.........aaaaaa.',
])])
write('items', 'relic-lamp', [art([
    '................',
    '.......aa.......',
    '......a..a......',
    '.....bbbbbb.....',
    '.....bYzzYb.....',
    '.....bzWWzb.....',
    '.....bYzzYb.....',
    '.....bbbbbb.....',
    '......bccb......',
    '......cccc......',
])])

# ---------------------------------------------------------------- picks 10 to 16 (H3; names are placeholders until canon)
PICK = ['................', '........xxx.....', '.......xxyxx....', '......xxy..yx...', '......xy.....yx.',
        '......x....cb.x.', '..........cb....', '.........cb.....', '........cb......', '.......cb.......',
        '......cb........', '.....cb.........', '....cb..........', '...cb...........', '................',
        '................']
for name, (x, y, handle) in {'steel': ('t', 'v', 'cb'), 'cobalt': ('C', 'D', 'cb'), 'obsidian': ('N', 'm', 'ab'),
                             'jade': ('G', 'H', 'cb'), 'sunsteel': ('p', 'z', 'ab'), 'moonsilver': ('v', 'W', 'cb'),
                             'songsteel': ('H', 'J', 'cb')}.items():
    rows = [r.replace('x', x).replace('y', y).replace('cb', handle) for r in PICK]
    write('items', f'pick-{name}', [art(rows)])

# ---------------------------------------------------------------- placed in the mine
write('objects', 'platform', [art([
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    'dddddddddddddddd',
    'cccdccccccdccccc',
    'b.a........a..b.',
    'b.............b.',
])])
lit = []
for f in range(2):
    c = art([
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '.....TSSaSSR....',
        '.....RRRaRRR....',
        '.....TSSaSSR....',
        '.....RRRaRRR....',
    ], floor=True)
    c.line(11, 7, 12, 5, 'a')
    c.grid(11, 2, ['.z.', 'zYz', '.T.'] if f == 0 else ['Y.Y', '.z.', 'Y.Y'])
    lit.append(c)
write('objects', 'charge-lit', lit, comment='frames: fuse spark 1-2')
shrine = []
for f in range(2):
    c = Cv(16, 24)
    c.rect(3, 4, 10, 18, 't'); c.rect(4, 5, 8, 16, 'u'); c.hline(3, 12, 4, 'v')
    c.rect(2, 21, 12, 3, 's'); c.hline(2, 13, 21, 't')
    c.hline(5, 6, 2, 'v'); c.hline(9, 10, 2, 'v'); c.rect(4, 3, 8, 1, 'v')
    glow = 'H' if f == 0 else 'J'
    for (x, y) in ((7, 8), (8, 8), (6, 9), (9, 9), (6, 10), (9, 10), (7, 11), (8, 11), (7, 13), (8, 13), (7, 15), (8, 16), (7, 17)):
        c.px(x, y, glow)
    shrine.append(c)
write('objects', 'shrine', shrine, anchor=(8, 23), comment='frames: verse glow 1-2')

# ---------------------------------------------------------------- props on the surface
# The Company office: where the Tallyman works. 48x32.
off = Cv(48, 32)
off.rect(4, 10, 40, 20, 's'); off.rect(5, 11, 38, 18, 't')
for x in range(5, 43, 4):
    off.vline(x, 11, 28, 's')
off.rect(2, 6, 44, 4, 'R'); off.hline(2, 45, 6, 'S'); off.hline(1, 46, 9, 'a')  # roof
off.rect(14, 1, 20, 5, 'k'); off.rect(15, 2, 18, 3, 'W')  # sign board
for x in range(17, 31, 3):
    off.vline(x, 3, 3, 'N')
off.rect(20, 18, 8, 12, 'a'); off.rect(21, 19, 6, 11, 'b'); off.px(25, 24, 'Y')  # door
for wx in (8, 32):
    off.rect(wx, 14, 7, 6, 'k'); off.rect(wx + 1, 15, 5, 4, 'Y'); off.vline(wx + 3, 15, 18, 'k'); off.hline(wx + 1, wx + 5, 16, 'k')
off.hline(0, 47, 30, 'a'); off.hline(0, 47, 31, 'a')
off2 = off.copy()
for wx in (8, 32):
    off2.rect(wx + 1, 15, 5, 4, 'z'); off2.vline(wx + 3, 15, 18, 'k'); off2.hline(wx + 1, wx + 5, 16, 'k')
write('props', 'company-office', [off, off2], anchor=(24, 31), comment='frames: lamp flicker 1-2')
# The tinker's cart: three relic offers on a striped awning cart. 32x24.
tk = Cv(32, 24)
for x in range(2, 30):
    tk.vline(x, 2, 5, 'S' if (x // 3) % 2 else 'W')
tk.hline(1, 30, 6, 'R')
tk.vline(3, 6, 18, 'b'); tk.vline(28, 6, 18, 'b')
tk.rect(2, 12, 28, 7, 'c'); tk.hline(2, 29, 12, 'd'); tk.hline(2, 29, 18, 'b')
for i, (gx, col) in enumerate(((8, 'Y'), (15, 'H'), (22, 'S'))):
    tk.rect(gx, 9, 3, 3, col); tk.px(gx + 1, 8, 'z')
tk.grid(6, 18, ['.aaa.', 'abvba', 'avbva', 'abvba', '.aaa.'])
tk.grid(21, 18, ['.aaa.', 'abvba', 'avbva', 'abvba', '.aaa.'])
write('props', 'tinker-cart', [tk], anchor=(16, 23))
# The tally board by the headframe: chalk tally of the day. 32x24.
tb = Cv(32, 24)
tb.vline(4, 8, 23, 'b'); tb.vline(27, 8, 23, 'b')
tb.rect(2, 2, 28, 16, 'a'); tb.rect(3, 3, 26, 14, 'k')
for gx in (5, 15):
    for i in range(4):
        tb.vline(gx + 2 * i, 6, 10, 'W')
    tb.line(gx - 1, 9, gx + 7, 7, 'E')
for i in range(2):
    tb.vline(25 + 2 * i, 6, 10, 'W')
tb.hline(5, 26, 13, 'v'); tb.hline(5, 14, 14, 'Y')
write('props', 'tally-board', [tb], anchor=(16, 23))
print('hybrid sprites ok')
