# M8-04: the ore heap beside the headframe (4 sizes) and the bar stack beside the forge (4 heights).
import random
from lib import Cv, write

def heap(stage):
    c = Cv(32, 16)
    w = [6, 12, 20, 28][stage]
    h = [3, 5, 8, 11][stage]
    rnd = random.Random(7 + stage)
    cx = 16
    for y in range(h):
        # a rounded mound: wider at the foot
        t = (y + 1) / h
        half = max(1, int(w / 2 * (t ** 0.6)))
        row = 15 - (h - 1 - y)
        for x in range(cx - half, cx + half):
            edge = x in (cx - half, cx + half - 1) or y == 0
            c.px(x, row, 't' if edge else ('u' if (x + row) % 3 else 'v'))
    # ore flecks: copper, tin, iron, a bright one on top
    cols = ['p', 'q', 'W', 'd', 'p']
    for i in range(3 + stage * 4):
        y = 15 - rnd.randrange(0, h)
        span = max(1, int(w / 2 * (((15 - y + 1) / h) ** 0.6)) - 1)
        x = cx + rnd.randrange(-span, span)
        if c.g[y][x] not in '.':
            c.px(x, y, cols[i % len(cols)])
    c.hline(cx - w // 2, cx + w // 2 - 1, 15, 's')
    return c

def bars(stage):
    c = Cv(16, 16)
    layers = [1, 2, 3, 4][stage]
    for k in range(layers):
        y = 14 - k * 3
        off = 1 if k % 2 else 0
        for b in range(2 if k % 2 else 3):
            x = 2 + off * 2 + b * 4
            c.rect(x, y, 4, 2, 'p')
            c.hline(x, x + 3, y, 'q')
            c.px(x + 3, y + 1, 'o')
    c.hline(1, 14, 15, 'a')
    return c

write('props', 'ore-heap', [heap(i) for i in range(4)], anchor=(16, 15), comment='M8-04: frames grow with the haul waiting for the forge')
write('props', 'bar-stack', [bars(i) for i in range(4)], anchor=(8, 15), comment='M8-04: frames grow with bars in hand')
