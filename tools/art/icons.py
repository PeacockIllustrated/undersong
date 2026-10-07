# M12-02: the install icons in public/icons, from the favicon's 8x8 pick, in master palette colours.
# Run from the repo root: python3 tools/art/icons.py
from PIL import Image

BG = (0x14, 0x1A, 0x33); GOLD = (0xFF, 0xD6, 0x5A); WOOD = (0x8A, 0x5A, 0x3B)
PX = {(x, 1): GOLD for x in range(1, 6)}
PX[(1, 2)] = GOLD; PX[(5, 2)] = GOLD
for y in range(2, 7): PX[(3, y)] = WOOD

def icon(size, pad):
    """Integer scale only; pad is cells of background around the 8x8 art (maskable icons need a safe zone)."""
    n = 8 + 2 * pad; k = size // n
    im = Image.new('RGB', (size, size), BG)
    off = (size - k * n) // 2
    for (x, y), c in PX.items():
        for dy in range(k):
            for dx in range(k):
                im.putpixel((off + (x + pad) * k + dx, off + (y + pad) * k + dy), c)
    return im

icon(192, 0).save('public/icons/icon-192.png', optimize=True)
icon(512, 0).save('public/icons/icon-512.png', optimize=True)
icon(512, 2).save('public/icons/icon-maskable-512.png', optimize=True)
icon(180, 0).save('public/icons/apple-touch-icon.png', optimize=True)
