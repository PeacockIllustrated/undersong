from lib import *
# ore overlays: 16x16, transparent over the host rock texture
def nuggets(cols, spots, seed=0):
    c=Cv(16,16); hi,mid,lo=cols
    for (x,y,sz) in spots:
        if sz==2:
            c.grid(x,y,['.'+hi+mid+'.', hi+mid+mid+lo, mid+mid+lo+lo, '.'+lo+lo+'.'])
        else:
            c.grid(x,y,[hi+mid, mid+lo])
    return c
SPOTS=[(1,2,2),(9,1,1),(11,6,2),(4,9,2),(12,12,1),(1,13,1),(7,13,1)]
SPOTS_B=[(2,1,1),(7,3,2),(12,2,1),(1,8,2),(10,9,2),(5,13,1),(13,14,1)]
write('ores','ore-copper',[nuggets(('q','p','o'),SPOTS)])
write('ores','ore-tin',[nuggets(('W','v','u'),SPOTS_B)])
write('ores','ore-iron',[nuggets(('d','b','R'),SPOTS)])
write('ores','ore-silver',[nuggets(('W','E','v'),SPOTS_B)])
write('ores','ore-gold',[nuggets(('z','Y','y'),SPOTS)])

def gems(hi,mid,lo):
    c=Cv(16,16)
    for (x,y) in [(3,2),(10,5),(5,10),(12,12)]:
        c.grid(x,y,['.'+hi+'.', hi+mid+lo, mid+mid+lo, '.'+lo+'.'])
    return c
write('ores','ore-aqua',[gems('E','D','C')])

# crystal: a whole tile of shards (drawn over the crystal ramp)
cr=from_rows([
'....E...........',
'...ED.......E...',
'...ED......EDC..',
'..EDDC.....EDC..',
'..EDDC....EDDC..',
'..EDDC....EDDC..',
'.EDDDCC...EDC...',
'.EDDDCC.........',
'........E.......',
'.......EDC......',
'.E.....EDC...E..',
'EDC...EDDDC.EDC.',
'EDC...EDDDC.EDC.',
'EDDC..EDDDC.EDDC',
'EDDC.EDDDDCCEDDC',
'................'])
write('ores','ore-crystal',[cr])

# glowcaps: little mushrooms growing out of the slate
gc=Cv(16,16)
for (x,y,big) in [(1,3,1),(7,1,0),(10,7,1),(3,10,0),(12,13,0),(6,12,1)]:
    if big:
        gc.grid(x,y,['.HHH.','HJHHH','.GHG.','..W..','..W..'])
    else:
        gc.grid(x,y,['.H.','HJH','.W.'])
write('ores','ore-glowcap',[gc])

em=from_rows([
'................',
'..T.........S...',
'..ST.......STz..',
'...ST.....ST....',
'....STT..ST.....',
'......STTS......',
'.......Tz.......',
'......ST.S......',
'.....ST...ST....',
'....ST.....STT..',
'..TS.........S..',
'..T.......T.....',
'.........STz....',
'....z....S......',
'...STT.........T',
'................'])
write('ores','ore-ember',[em])

ht=from_rows([
'................',
'....RR....RR....',
'...RSSR..RSSR...',
'..RSTTSRRSTTSR..',
'..RSTzTSSTTTSR..',
'..RSTzzTTTTTSR..',
'...RSTTTTTTSR...',
'....RSTTTTSR....',
'.....RSTTSR.....',
'......RSSR......',
'.......RR.......',
'................',
'.Y...........Y..',
'YzY.........YzY.',
'.Y...........Y..',
'................'])
write('ores','ore-heart',[ht])

# verse carving: a glyph cut into the stone; frame 2 is the lit, found state
glyph=[
'................',
'..ssssssssssss..',
'..s..........s..',
'..s.ss....ss.s..',
'..s..s....s..s..',
'..s..ssssss..s..',
'..s....ss....s..',
'..s...s..s...s..',
'..s..s....s..s..',
'..s....ss....s..',
'..s...ssss...s..',
'..s..........s..',
'..ssssssssssss..',
'................',
'................',
'................']
dim=from_rows(glyph)
lit=from_rows(glyph).recolor({'s':'D'})
for (x,y) in [(4,3),(11,3),(7,10),(8,10)]: lit.px(x,y,'E')
write('ores','carving',[dim,lit])
print('ores ok')
