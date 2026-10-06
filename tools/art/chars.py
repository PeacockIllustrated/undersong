from lib import *
# 16x24 characters, facing right, feet on row 22, anchor bottom-centre.
def body(hat='helmet', hatc=('y','Y','z'), skin=('q','d'), shirt=('C','D'), legs=('l','m'), boots='a', hair=None, beard=None, apron=None, short=False, skirt=False):
    c=Cv(16,24); o=2 if short else 0
    sk,sd=skin; sh,sl=shirt; lg,ll=legs
    top=3+o
    # head
    c.rect(5,top+3,5,3,sk); c.vline(10,top+3,top+5,sd)
    c.px(8,top+4,'N')  # eye
    c.hline(6,9,top+6,sd)
    if hair:
        c.hline(5,9,top+2,hair); c.px(4,top+3,hair); c.px(4,top+4,hair); c.px(5,top+3,hair)
    if hat=='helmet':
        d,m,l=hatc
        c.hline(6,9,top,m); c.px(5,top,d); c.px(10,top,d)
        c.hline(5,10,top+1,m); c.px(11,top+1,l)  # lamp
        c.hline(4,11,top+2,d)
    elif hat=='cap':
        d,m,l=hatc
        c.hline(5,9,top+1,m); c.hline(5,11,top+2,d); c.hline(6,8,top,m)
    elif hat=='bald':
        c.hline(6,9,top+2,sk); c.px(5,top+3,sk)
    if beard:
        c.rect(6,top+6,4,2,beard); c.px(10,top+5,beard)
    # torso
    t=top+7
    c.rect(4,t,8,5,sh); c.vline(5,t+1,t+3,sl); c.px(4,t,sl)
    c.px(3,t+2,sh); c.px(3,t+3,sk)          # back arm/hand
    c.px(12,t+2,sh); c.px(12,t+3,sk)        # front hand
    if apron:
        c.rect(6,t+1,5,5,apron)
    c.hline(4,11,t+5,'a')                   # belt
    lt=t+6
    if skirt:
        c.rect(4,lt,8,22-lt-1,lg); c.vline(5,lt,21,ll)
    else:
        c.rect(4,lt,3,22-lt-1,lg); c.rect(9,lt,3,22-lt-1,lg); c.vline(5,lt,20,ll)
    c.hline(3,6,21,boots); c.hline(9,12,21,boots); c.hline(3,6,22,boots); c.hline(9,12,22,boots)
    return c

def with_pick(base,angle,head=('v','u'),handle='c'):
    c=base.copy(); hx,hy=12,13
    if angle==0:   # raised behind
        c.line(hx,hy,9,2,handle); c.line(7,2,11,1,head[0]); c.px(7,3,head[1]); c.px(11,2,head[1])
    elif angle==1: # overhead forward
        c.line(hx,hy,14,3,handle); c.line(12,3,15,4,head[0]); c.px(12,2,head[1]); c.px(15,5,head[1])
    else:          # strike, down in front
        c.line(hx,hy,15,13,handle); c.line(15,10,15,15,head[0]); c.px(14,10,head[1]); c.px(14,16,head[1])
    return c

def idle2(c):
    d=c.copy()
    # breath: shift the head and torso down by one pixel, legs stay
    g=d.g
    rows=[r[:] for r in g]
    for y in range(17,0,-1): g[y]=rows[y-1][:]
    g[0]=['.']*16
    return d

fore=body()
write('chars','foreman',[fore,idle2(fore),with_pick(fore,0),with_pick(fore,1),with_pick(fore,2)],anchor=(8,23),comment='frames: idle 1-2, swing 3-5')
miner=body(hat='cap',hatc=('t','v','W'),shirt=('c','d'),legs=('l','m'))
write('chars','miner',[miner,idle2(miner),with_pick(miner,0),with_pick(miner,1),with_pick(miner,2)],anchor=(8,23),comment='frames: idle 1-2, swing 3-5')
wren=body(hat='bald',hair='W',shirt=('m','n'),legs=('l','m'),skirt=True)
wren.hline(5,9,5,'W'); wren.hline(5,10,6,'W'); wren.px(4,7,'W'); wren.px(4,8,'W')
wren.vline(13,8,22,'b'); wren.grid(12,4,['.a.','aYa','aza','.a.'])
w2=wren.copy(); w2.px(13,6,'Y')
write('chars','wren',[wren,w2],anchor=(8,23))
pell=body(hat='bald',hair='p',shirt=('h','i'),legs=('c','d'),short=True)
pell.hline(5,9,7,'p'); pell.hline(5,10,8,'o'); pell.px(4,9,'o')
p2=idle2(pell)
write('chars','pell',[pell,p2],anchor=(8,23))
bram=body(hat='bald',beard='b',shirt=('t','u'),legs=('l','m'),apron='c')
bram.grid(12,13,['vv.','vvv','.c.','.c.','.c.'])
b2=idle2(bram)
write('chars','bram',[bram,b2],anchor=(8,23))
print('chars ok')
