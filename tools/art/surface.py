# Holloway above (M6, ADR-029): Tansy, Rook, barley, the woodlot, the cookhouse, cottages and the cairn.
# Run from tools/art: python3 surface.py
from lib import *
from chars import body, idle2

def blob(c, cx, cy, r, col, sq=1.15):
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            if (x - cx) ** 2 + ((y - cy) * sq) ** 2 <= r * r: c.px(x, y, col)

# --- Tansy, the farmer: straw hat, green smock, a sickle ---
def tansy_base():
    c = body(hat='bald', hair='o', shirt=('g', 'h'), legs=('c', 'd'), apron='d')
    # wide straw hat
    c.hline(5, 10, 3, 'Y'); c.hline(3, 12, 4, 'y'); c.hline(4, 11, 5, 'Y'); c.px(6, 2, 'Y'); c.hline(6, 9, 2, 'z')
    c.px(4, 6, 'o'); c.px(4, 7, 'o')  # hair under the brim
    # sickle in the front hand
    c.vline(13, 12, 15, 'c'); c.grid(12, 9, ['vvv.', '...v', '...v'])
    return c
t = tansy_base()
write('chars', 'tansy', [t, idle2(t)], anchor=(8, 23), comment='Tansy, the farmer')

# --- Rook, the woodcutter: red shirt, beard, axe on shoulder ---
r = body(hat='cap', hatc=('R', 'S', 'T'), shirt=('R', 'S'), legs=('l', 'm'), beard='b')
r.line(12, 14, 14, 4, 'c'); r.grid(13, 2, ['uv.', 'uvv', 'uv.'])
write('chars', 'rook', [r, idle2(r)], anchor=(8, 23), comment='Rook, the woodcutter')

# --- crops: 16x16, frames = sprout, green, tall, ripe, golden ---
def furrow(c):
    c.rect(0, 13, 16, 3, 'b'); c.hline(0, 15, 13, 'c')
    for x in range(1, 16, 4): c.px(x, 14, 'a'); c.px(x + 1, 15, 'a')

def barley(stage, golden=False):
    c = Cv(16, 16); furrow(c)
    stalk, ear, hi = ('h', 'g', 'i')
    if stage >= 3: stalk, ear, hi = ('y', 'Y', 'z') if golden else ('y', 'y', 'Y')
    for i, x in enumerate((2, 6, 10, 14)):
        if stage == 0:
            c.px(x, 12, 'i'); c.px(x - 1, 11, 'h'); continue
        top = {1: 9, 2: 5, 3: 3}[stage] + (i % 2)
        c.vline(x, top, 12, stalk if stage < 3 else 'y')
        if stage == 1: c.px(x + 1, top, 'i'); continue
        c.vline(x, top - 1, top + 3, ear); c.px(x - 1, top, ear); c.px(x + 1, top + 1, ear); c.px(x, top - 1, hi)
        if stage == 3: c.px(x + 1, top - 1, hi) ; c.px(x - 1, top + 2, ear)
        c.px(x - 1, top + 6, 'h')
    if golden: c.px(1, 2, 'z'); c.px(12, 1, 'z'); c.px(8, 0, 'W')
    return c
write('crops', 'crop-barley', [barley(0), barley(1), barley(2), barley(3), barley(3, True)], comment='frames: sprout, green, tall, ripe, golden')

# --- woodlot ---
sap = Cv(16, 16)
sap.vline(8, 9, 15, 'b'); sap.px(7, 15, 'b')
blob(sap, 8, 6, 4, 'g'); blob(sap, 7, 5, 3, 'h'); sap.px(6, 3, 'i'); sap.px(9, 4, 'i')
write('props', 'tree-sapling', [sap], anchor=(8, 15))

yg = Cv(16, 32)
yg.rect(7, 16, 3, 16, 'b'); yg.vline(7, 16, 31, 'c'); yg.vline(9, 16, 31, 'a')
for (cx, cy, rr, col) in [(8, 10, 7, 'g'), (8, 8, 6, 'h'), (6, 6, 3, 'i'), (10, 5, 2, 'i')]: blob(yg, cx, cy, rr, col)
write('props', 'tree-young', [yg], anchor=(8, 31))

stump = Cv(16, 8)
stump.rect(5, 2, 6, 6, 'b'); stump.hline(5, 10, 2, 'd'); stump.hline(6, 9, 3, 'c'); stump.px(7, 3, 'd'); stump.vline(10, 3, 7, 'a'); stump.px(4, 7, 'b'); stump.px(11, 7, 'b')
write('props', 'tree-stump', [stump], anchor=(8, 7))

# The elder: a tree that has stood through three Cave-ins. Its canopy carries a glint of the song.
el = Cv(48, 48)
el.rect(20, 26, 9, 22, 'b'); el.vline(20, 26, 47, 'c'); el.vline(28, 26, 47, 'a'); el.vline(23, 30, 44, 'a')
el.line(19, 47, 15, 47, 'b'); el.line(29, 46, 33, 47, 'b')
for (cx, cy, rr, col) in [(24, 17, 16, 'g'), (13, 22, 9, 'g'), (35, 22, 9, 'g'), (24, 13, 13, 'h'), (15, 18, 7, 'h'), (33, 17, 8, 'h'), (21, 8, 6, 'i'), (30, 10, 4, 'i'), (12, 15, 3, 'i')]:
    blob(el, cx, cy, rr, col)
for (x, y) in [(17, 12), (29, 18), (22, 22), (36, 13), (11, 20)]: el.px(x, y, 'H'); el.px(x, y - 1, 'J')
write('props', 'tree-elder', [el], anchor=(24, 47), comment='an elder: stood through 3 Cave-ins, roots reach into the mine')

# --- Tansy's cookhouse: log walls, thatch roof, a granary bin and a feast bell ---
def roof(c, x0, x1, ytop, rows, col):
    d, m, l = col
    for rr in range(rows):
        a = x0 + rows - 1 - rr; b = x1 - (rows - 1 - rr)
        c.hline(a, b, ytop + rr, m); c.px(a, ytop + rr, l); c.px(b, ytop + rr, d)
        if rr % 2: 
            for x in range(a + 2, b, 4): c.px(x, ytop + rr, d)
    c.hline(x0, x1, ytop + rows, d)
def logs(c, x0, x1, y0, y1):
    for y in range(y0, y1 + 1):
        c.hline(x0, x1, y, 'c' if (y - y0) % 3 else 'b')
        if (y - y0) % 3 == 1: c.hline(x0, x1, y, 'd')
    c.vline(x0, y0, y1, 'b'); c.vline(x1, y0, y1, 'b')
def window(c, x, y, lit=True):
    c.rect(x, y, 5, 4, 'a'); c.rect(x + 1, y + 1, 3, 2, 'Y' if lit else 'l')
    if lit: c.px(x + 1, y + 1, 'z')
    c.vline(x + 2, y + 1, y + 2, 'a')
def cookhouse(bell):
    c = Cv(48, 32)
    logs(c, 3, 30, 17, 31)
    roof(c, 0, 33, 6, 11, ('y', 'Y', 'z'))
    c.rect(24, 0, 4, 8, 's'); c.rect(25, 0, 2, 8, 't')
    window(c, 6, 21); c.rect(15, 22, 6, 10, 'a'); c.rect(16, 23, 4, 9, 'b'); c.px(19, 27, 'Y')
    # granary bin, barley spilling out the top
    c.rect(34, 14, 11, 18, 'b'); c.vline(34, 14, 31, 'a'); c.vline(44, 14, 31, 'a')
    for y in (18, 24, 30): c.hline(34, 44, y, 'a')
    c.hline(35, 43, 13, 'y'); c.hline(36, 42, 12, 'Y'); c.hline(38, 40, 11, 'z')
    # feast bell on a post
    c.vline(46, 8, 31, 'c'); c.hline(42, 47, 8, 'b'); c.vline(43, 9, 10, 'a')
    bx = 43 if not bell else 44
    c.grid(bx - 1, 11, ['.y.', 'yYy', 'yYy', 'yyy'])
    c.hline(0, 47, 31, 'a')
    return c
write('props', 'cookhouse', [cookhouse(0), cookhouse(1)], anchor=(24, 31), comment="Tansy's cookhouse, granary and feast bell; frames: still, ringing")

# --- the cairn: one stone per Cave-in, frames = 1 to 5 stones ---
def cairn(n):
    c = Cv(16, 16)
    stones = [(2, 12, 6, 4), (8, 12, 6, 4), (4, 8, 7, 4), (5, 4, 5, 4), (6, 1, 3, 3)]
    for i, (x, y, w, h) in enumerate(stones[:n]):
        c.rect(x, y, w, h, 'u'); c.hline(x, x + w - 1, y, 'v'); c.vline(x + w - 1, y + 1, y + h - 1, 't'); c.hline(x, x + w - 1, y + h - 1, 't')
        c.px(x + 1, y + 1 + (h > 3), 's')  # carved mark
    if n >= 5: c.px(7, 0, 'H')
    return c
write('props', 'cairn', [cairn(i) for i in range(1, 6)], anchor=(8, 15), comment='a stone for each Cave-in; frames: 1 to 5 stones')

# --- HUD icons 16x16 ---
sheaf = Cv(16, 16)
for x in (5, 7, 9, 11): sheaf.line(8, 14, x, 3, 'y')
for x in (4, 6, 8, 10, 12): sheaf.rect(x, 2, 1, 3, 'Y'); sheaf.px(x, 1, 'z')
sheaf.hline(6, 10, 9, 'b'); sheaf.hline(6, 10, 10, 'c')
write('items', 'barley', [sheaf])
log = Cv(16, 16)
log.rect(2, 6, 11, 6, 'c'); log.hline(2, 12, 6, 'd'); log.hline(2, 12, 11, 'b'); log.hline(4, 9, 8, 'b')
blob(log, 13, 8, 3, 'd', 1.0); log.px(13, 8, 'q'); log.px(12, 9, 'c'); log.vline(16, 6, 11, 'b')
write('items', 'timber', [log])
# --- a cottage, bought with timber; they stand in a back row behind the village ---
def cottage(v):
    c = Cv(32, 24)
    logs(c, 4, 27, 12, 23)
    roof(c, 1, 30, 2, 10, (('R', 'o', 'S') if v else ('y', 'Y', 'z')))
    window(c, 7 if v else 20, 15)
    c.rect(19 if v else 8, 15, 5, 9, 'a'); c.rect(20 if v else 9, 16, 3, 8, 'b'); c.px(22 if v else 11, 19, 'Y')
    c.rect(23 if v else 6, 0, 3, 6, 's'); c.vline(24 if v else 7, 0, 5, 't')
    c.hline(0, 31, 23, 'a')
    return c
write('props', 'cottage', [cottage(0), cottage(1)], anchor=(16, 23), comment='frames: thatch, tile; they alternate along the row')
print('surface sprites ok')
