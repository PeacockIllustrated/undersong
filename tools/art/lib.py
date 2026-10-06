import os
ROOT='/home/claude/undersong/assets/sprites'
class Cv:
    def __init__(s,w,h): s.w,s.h=w,h; s.g=[['.']*w for _ in range(h)]
    def px(s,x,y,c):
        if 0<=x<s.w and 0<=y<s.h and c: s.g[y][x]=c
    def rect(s,x,y,w,h,c):
        for yy in range(y,y+h):
            for xx in range(x,x+w): s.px(xx,yy,c)
    def hline(s,x0,x1,y,c):
        for x in range(x0,x1+1): s.px(x,y,c)
    def vline(s,x,y0,y1,c):
        for y in range(y0,y1+1): s.px(x,y,c)
    def line(s,x0,y0,x1,y1,c):
        dx=abs(x1-x0); dy=-abs(y1-y0); sx=1 if x0<x1 else -1; sy=1 if y0<y1 else -1; err=dx+dy
        while True:
            s.px(x0,y0,c)
            if x0==x1 and y0==y1: break
            e2=2*err
            if e2>=dy: err+=dy; x0+=sx
            if e2<=dx: err+=dx; y0+=sy
    def grid(s,x,y,rows,tr='.'):
        for j,r in enumerate(rows):
            for i,ch in enumerate(r):
                if ch!=tr: s.px(x+i,y+j,ch)
    def recolor(s,m):
        for row in s.g:
            for i,ch in enumerate(row):
                if ch in m: row[i]=m[ch]
        return s
    def copy(s):
        c=Cv(s.w,s.h); c.g=[r[:] for r in s.g]; return c
    def flipx(s):
        c=Cv(s.w,s.h); c.g=[r[::-1] for r in s.g]; return c
    def rows(s): return [''.join(r) for r in s.g]
    def outline(s,c,inner_only=False):
        # self-outline: transparent pixels next to filled ones get c
        g=[r[:] for r in s.g]
        for y in range(s.h):
            for x in range(s.w):
                if s.g[y][x]=='.':
                    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                        xx,yy=x+dx,y+dy
                        if 0<=xx<s.w and 0<=yy<s.h and s.g[yy][xx] not in '.' and s.g[yy][xx]!=c:
                            g[y][x]=c; break
        s.g=g; return s

def write(sub,name,frames,anchor=None,palette='master',comment=None):
    w,h=frames[0].w,frames[0].h
    rows=[]
    for f in frames:
        assert f.w==w and f.h==h
        rows+=f.rows()
    os.makedirs(os.path.join(ROOT,sub),exist_ok=True)
    hdr=[]
    if comment: hdr.append('# '+comment)
    hdr+= [f'palette: {palette}', f'size: {w}x{h}']
    if len(frames)>1: hdr.append(f'frames: {len(frames)}')
    if anchor: hdr.append(f'anchor: {anchor[0]},{anchor[1]}')
    open(os.path.join(ROOT,sub,name+'.sprite'),'w').write('\n'.join(hdr)+'\n---\n'+'\n'.join(rows)+'\n')

def from_rows(rows):
    c=Cv(len(rows[0]),len(rows))
    for r in rows: assert len(r)==c.w,(r,len(r))
    c.grid(0,0,rows); return c
