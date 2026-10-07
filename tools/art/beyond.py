# M11 Beyond the song: the Endless Depth marker stone.
from lib import write, from_rows

def marker():
    c = from_rows([
        '................',
        '......vvvv......',
        '.....vuuuuv.....',
        '.....uuuuut.....',
        '.....usuuut.....',
        '.....yYYYYy.....',
        '.....uuuuut.....',
        '.....us.sut.....',
        '.....uu.uut.....',
        '.....us.sut.....',
        '.....uuuuut.....',
        '.....yYYYYy.....',
        '.....uuuuut.....',
        '....vuuuuutt....',
        '....tttttttt....',
        '................',
    ])
    c.outline('N')
    return c

write('props', 'marker', [marker()], anchor=(8, 15), comment='M11-01: a marker stone every 500 ft under the Heart')
