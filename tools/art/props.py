from lib import *
def roof(c,x0,x1,ytop,rows,col=('R','o','S')):
    d,m,l=col
    for r in range(rows):
        a=x0+rows-1-r; b=x1-(rows-1-r)
        c.hline(a,b,ytop+r,m); c.px(a,ytop+r,l); c.px(b,ytop+r,d)
    c.hline(x0,x1,ytop+rows,d)

def window(c,x,y,lit=True):
    c.rect(x,y,5,4,'a'); c.rect(x+1,y+1,3,2,'Y' if lit else 'l'); 
    if lit: c.px(x+1,y+1,'z')
    c.vline(x+2,y+1,y+2,'a')

def logs(c,x0,x1,y0,y1):
    for y in range(y0,y1+1):
        c.hline(x0,x1,y,'c' if (y-y0)%3 else 'b')
        if (y-y0)%3==1: c.hline(x0,x1,y,'d')
    c.vline(x0,y0,y1,'b'); c.vline(x1,y0,y1,'b')

# Bunkhouse 48x32
bk=Cv(48,32)
logs(bk,4,43,16,31)
roof(bk,1,46,4,12)
window(bk,8,20); window(bk,35,20)
bk.rect(21,21,6,11,'a'); bk.rect(22,22,4,10,'b'); bk.px(25,27,'Y')
bk.rect(36,0,4,8,'s'); bk.rect(37,0,2,8,'t')     # chimney
bk.hline(4,43,31,'a')
write('props','bunkhouse',[bk],anchor=(24,31))

# Forge 48x32: stone walls, chimney, glowing mouth, anvil out front
def forge(glow):
    c=Cv(48,32)
    for y in range(14,32):
        for x in range(6,40):
            c.px(x,y,'u' if ((x//4 + y//3)%2) else 'v')
        if y%3==0: c.hline(6,39,y,'t')
    roof(c,3,42,4,10,('s','t','u'))
    c.rect(30,0,6,10,'t'); c.rect(31,0,4,10,'u'); c.hline(30,35,0,'s')
    c.rect(15,20,14,12,'a')
    m=('T','S','z') if glow else ('S','R','T')
    c.rect(16,22,12,10,m[1]); c.rect(18,24,8,8,m[0]); c.rect(20,26,4,4,m[2])
    c.grid(40,24,['.ssssss.','tuuuuuut','..tuut..','..tuut..','.ssssss.','.tttttt.','........','........'])
    return c
write('props','forge',[forge(True),forge(False)],anchor=(24,31))

# Lamp-works 48x32: workshop with a great glass lamp on the roof
def lampworks(on):
    c=Cv(48,32)
    logs(c,6,41,18,31)
    roof(c,3,44,9,9,('l','m','n'))
    c.rect(19,1,10,9,'a'); c.rect(20,2,8,7,'Y' if on else 'y'); c.rect(22,3,4,5,'z' if on else 'Y'); c.hline(18,29,9,'a'); c.hline(21,26,0,'a')
    window(c,10,22,on); window(c,33,22,on)
    for i,x in enumerate((21,24,27)):
        c.rect(x,24,2,4,'G'); c.px(x,24,'H' if on else 'G'); c.px(x+1,25,'J' if on else 'H')
    c.hline(19,29,28,'b'); c.hline(6,41,31,'a')
    return c
write('props','lampworks',[lampworks(True),lampworks(False)],anchor=(24,31))

# Kiln 32x32: brick dome
def kiln(f):
    c=Cv(32,32)
    for y in range(8,32):
        half=int(13*((1-((31-y)/23.0)**2))**0.5) if y<31 else 13
        half=max(4,min(13,half))
        for x in range(16-half,16+half):
            c.px(x,y,'o' if ((x//3 + (y//2)%2)%2) else 'p')
        if y%2==0: c.hline(16-half,15+half,y,'o')
        c.px(16-half,y,'R'); c.px(15+half,y,'R')
    c.rect(13,2,6,7,'o'); c.rect(14,2,4,7,'p'); c.hline(13,18,2,'R')
    c.rect(11,22,10,10,'a')
    if f: c.rect(12,24,8,8,'S'); c.rect(14,26,4,6,'T'); c.rect(15,28,2,4,'z')
    else: c.rect(12,24,8,8,'R'); c.rect(14,27,4,5,'S')
    return c
write('props','kiln',[kiln(True),kiln(False)],anchor=(16,31))

# Song-loom 48x32: a wooden loom strung with crystal
def loom(phase):
    c=Cv(48,32)
    c.rect(4,4,4,28,'c'); c.vline(4,4,31,'b'); c.rect(40,4,4,28,'c'); c.vline(43,4,31,'b')
    c.rect(2,2,44,4,'b'); c.hline(2,45,2,'d'); c.rect(6,24,36,3,'b'); c.hline(6,41,24,'d')
    for i,x in enumerate(range(10,40,3)):
        col='E' if (i+phase)%3==0 else 'D'
        c.vline(x,6,23,col)
    c.rect(18,10,12,8,'C'); c.rect(19,11,10,6,'D'); c.rect(21,12,6,4,'E'); c.px(23,13,'J' if phase else 'W')
    c.hline(4,43,31,'a')
    return c
write('props','songloom',[loom(0),loom(1),loom(2)],anchor=(24,31))

# Headframe 32x32 over the shaft, with a winch wheel
def headframe(t):
    c=Cv(32,32)
    c.line(4,31,13,3,'c'); c.line(5,31,14,3,'b'); c.line(27,31,18,3,'c'); c.line(26,31,17,3,'b')
    c.hline(9,22,12,'c'); c.hline(9,22,13,'b')
    c.rect(11,1,10,3,'b'); c.hline(11,20,1,'d')
    cx,cy=16,6
    import math
    for a in range(0,360,15):
        r=4; x=int(round(cx+r*math.cos(math.radians(a)))); y=int(round(cy+r*math.sin(math.radians(a)))); c.px(x,y,'u')
    for a in (0,60,120):
        a+=t*20
        for r in range(1,4):
            c.px(int(round(cx+r*math.cos(math.radians(a)))),int(round(cy+r*math.sin(math.radians(a)))),'v')
            c.px(int(round(cx-r*math.cos(math.radians(a)))),int(round(cy-r*math.sin(math.radians(a)))),'v')
    c.px(cx,cy,'s')
    c.vline(16,10,31,'d')
    return c
write('props','headframe',[headframe(0),headframe(1),headframe(2)],anchor=(16,31))

# Tree 32x48
tr=Cv(32,48)
tr.rect(14,26,5,22,'b'); tr.vline(14,26,47,'c'); tr.vline(18,26,47,'a')
tr.px(12,46,'b'); tr.px(20,47,'b')
import math
for (cx,cy,r,col) in [(16,16,11,'g'),(10,20,7,'g'),(23,20,7,'g'),(16,13,9,'h'),(11,17,5,'h'),(21,16,6,'h'),(14,9,5,'i'),(20,11,3,'i')]:
    for y in range(cy-r,cy+r+1):
        for x in range(cx-r,cx+r+1):
            if (x-cx)**2+((y-cy)*1.15)**2<=r*r: tr.px(x,y,col)
write('props','tree',[tr],anchor=(16,47))
print('props ok')
