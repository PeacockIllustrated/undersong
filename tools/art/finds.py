# M10 Finds: the tinker's cart, Pell's dog (Biscuit) and the curio icons.
from lib import Cv, write, from_rows

def cart():
    c = Cv(32, 24)
    # canvas hood on hoops
    for x in range(5, 25):
        top = 6 + (abs(x - 15) * abs(x - 15)) // 22
        c.vline(x, top, 13, 'W' if (x // 3) % 2 == 0 else 'z')
    c.hline(5, 24, 6, 'z')
    for x in (5, 24):
        c.vline(x, 7, 13, 'v')
    # wagon bed
    c.rect(3, 14, 24, 4, 'c')
    c.hline(3, 26, 14, 'd')
    c.hline(3, 26, 17, 'b')
    for x in (8, 14, 20):
        c.vline(x, 15, 16, 'b')
    # pans and a kettle hanging off the side
    c.px(26, 12, 'u'); c.px(27, 13, 'v'); c.rect(26, 13, 2, 2, 'v'); c.px(27, 15, 'u')
    c.rect(1, 12, 2, 2, 'p'); c.px(2, 11, 'q')
    # shafts
    c.line(26, 16, 31, 15, 'b')
    # wheels
    for cx in (8, 21):
        for dx in range(-3, 4):
            for dy in range(-3, 4):
                d = dx * dx + dy * dy
                if 6 <= d <= 10: c.px(cx + dx, 20 + dy, 'a')
                elif d == 0: c.px(cx, 20, 'u')
        c.px(cx, 18, 'b'); c.px(cx, 22, 'b'); c.px(cx - 2, 20, 'b'); c.px(cx + 2, 20, 'b')
    # a lantern on a pole
    c.vline(4, 3, 13, 'b'); c.px(4, 2, 'Y'); c.px(3, 3, 'y'); c.px(5, 3, 'y')
    return c

def dog(frame):
    c = Cv(16, 16)
    body = [
        '................',
        '..........aa....',
        '..........ccc...',
        '.c.......cdcca..',
        '..c......ccccaa.',
        '...ccccccccc....',
        '...cdddddddc....',
        '...ccccccccc....',
        '...c.c...c.c....',
        '...c.c...c.c....',
        '................',
        '................',
    ]
    c.grid(0, 4, body)
    c.px(12, 7, 'N')  # eye
    if frame == 1:
        # legs mid-stride, tail up
        for x in (3, 5, 9, 11):
            c.px(x, 12, '.'); c.px(x, 13, '.')
        c.px(2, 12, 'c'); c.px(4, 13, 'c'); c.px(10, 12, 'c'); c.px(12, 13, 'c')
        c.px(1, 7, '.'); c.px(1, 6, 'c'); c.px(2, 7, 'c')
    c.outline('a')
    return c

def curio(rarity):
    c = Cv(16, 16)
    if rarity == 0:
        # a worn trinket: a round tin with a lid
        c.rect(4, 6, 8, 6, 'u'); c.hline(4, 11, 6, 'v'); c.hline(3, 12, 5, 'v'); c.px(7, 4, 'W'); c.px(8, 4, 'W')
        c.hline(4, 11, 11, 't')
    elif rarity == 1:
        # a little bell, gilt
        c.rect(5, 5, 6, 6, 'Y'); c.hline(4, 11, 10, 'y'); c.hline(6, 9, 4, 'Y'); c.px(7, 3, 'y'); c.px(8, 3, 'y')
        c.px(6, 6, 'z'); c.px(6, 7, 'z'); c.px(7, 11, 'o')
    else:
        # a singing shell, glowing
        rows = [
            '......HH........',
            '.....HJJH.......',
            '....HJHHJH......',
            '...HJHGGHJH.....',
            '..HJHGJJGHJH....',
            '..HJHGJJGHJH....',
            '...HJHGGHJH.....',
            '....HJHHJH......',
            '.....HJJH.......',
            '......GG........',
        ]
        c.grid(3, 3, rows)
    c.outline('N')
    return c

write('props', 'cart', [cart()], anchor=(16, 23), comment="M10-01: the tinker's cart, parked by the shaft")
write('chars', 'dog', [dog(0), dog(1)], anchor=(8, 14), comment="M10-03: Pell's dog, Biscuit (2-frame trot)")
write('items', 'curio', [curio(0), curio(1), curio(2)], comment='M10-02: curio icons by rarity: common, fine, singing')
