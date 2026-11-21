"""Physics sanity check for Prana poses: ports figure.js build/solve and flags
poses whose centre of mass is not over the floor contacts, or whose joints bend
the wrong way. Usage: python3 tools/check_poses.py js/poses.js [name ...]   (no output = all good)"""
import sys, re, json, math
src = open(sys.argv[1]).read()
body = src[src.index('const D = {') + 10: src.index('};', src.index('shoulderStand')) + 1]
# JS object literal -> JSON
j = re.sub(r'//[^\n]*', '', body)
j = re.sub(r'([{,]\s*)([A-Za-z_]\w*)\s*:', r'\1"\2":', j)
j = j.replace("'", '"')
j = re.sub(r',(\s*[}\]])', r'\1', j)
D = json.loads(j)

def resolve(n):
    d = D[n]
    if 'b' not in d: return dict(d)
    o = resolve(d['b']); o.update(d); o.pop('b'); return o

L = dict(t1=26, t2=26, neck=5, head=10, ua=28, fa=30, th=44, sh=42, ft=13, sw=16, hw=9, shOff=4)
RAD = dict(hip=7, mid=7, neck=6, head=10, sh=6, el=3.5, ha=3.5, kn=4.5, an=3.5, to=3)
PTS = [('hip','hip'),('mid','mid'),('neck','neck'),('head','head'),('lsh','sh'),('rsh','sh'),('lel','el'),('lha','ha'),('rel','el'),('rha','ha'),('lkn','kn'),('lan','an'),('lto','to'),('rkn','kn'),('ran','an'),('rto','to')]
DEF = dict(v='s', t1=180, la1=-3, la2=-3, ra1=3, ra2=4, ll1=-2, ll2=-2, rl1=2, rl2=2, lift=0, dx=0)
R = math.pi / 180
def add(p, l, d): return [p[0]+l*d[0], p[1]+l*d[1], p[2]+l*d[2]]
def dir3(a, pl):
    s, c = math.sin(a*R), math.cos(a*R)
    return [0, c, -s] if pl == 'f' else [s, c, 0]
def normalize(p):
    q = dict(DEF); q.update(p)
    q.setdefault('t2', q['t1']); q.setdefault('hd', q['t2'])
    if q['v'] == 'f': q.setdefault('lf', 0); q.setdefault('rf', 0)
    else: q.setdefault('lf', q['ll2']+90); q.setdefault('rf', q['rl2']+90)
    return q
def build(q):
    pl = 'f' if q['v'] == 'f' else 's'; Dd = lambda a: dir3(a, pl); P = {}
    P['hip'] = [0,0,0]; P['mid'] = add(P['hip'], L['t1'], Dd(q['t1'])); P['neck'] = add(P['mid'], L['t2'], Dd(q['t2']))
    P['head'] = add(P['neck'], L['neck']+L['head'], Dd(q['hd']))
    sc = add(P['neck'], -L['shOff'], Dd(q['t2']))
    latS = [0,0,-1] if pl == 's' else Dd(q['t2']+90); latH = [0,0,-1] if pl == 's' else Dd(q['t1']+90)
    P['lsh'] = add(sc, L['sw'], latS); P['rsh'] = add(sc, -L['sw'], latS)
    P['lhp'] = add(P['hip'], L['hw'], latH); P['rhp'] = add(P['hip'], -L['hw'], latH)
    for s in 'lr':
        P[s+'el'] = add(P[s+'sh'], L['ua'], Dd(q[s+'a1'])); P[s+'ha'] = add(P[s+'el'], L['fa'], Dd(q[s+'a2']))
        P[s+'kn'] = add(P[s+'hp'], L['th'], Dd(q[s+'l1'])); P[s+'an'] = add(P[s+'kn'], L['sh'], Dd(q[s+'l2']))
        if pl == 's': P[s+'to'] = add(P[s+'an'], L['ft'], Dd(q[s+'f']))
        else:
            out = (1 if s == 'l' else -1) * latH[2]; v = [0.93, 0.12, out*0.35]; n = math.sqrt(sum(x*x for x in v))
            P[s+'to'] = add(P[s+'an'], L['ft']*0.85, [x/n for x in v])
    return P
def solve(q):
    P = build(q); ik = q.get('ik') or {}
    floor = max(P[k][1] + RAD[r] for k, r in PTS if not (k[0] in ik and (k.endswith('el') or k.endswith('ha'))))
    sy = -floor - (q.get('lift') or 0)
    for k in P: P[k] = [P[k][0] + (q.get('dx') or 0), P[k][1] + sy, P[k][2]]
    for s in 'lr':
        if s not in ik: continue
        S = P[s+'sh']; T = [S[0] + (ik[s].get('dx') or 0), -RAD['ha']]
        P[s+'ha'] = [T[0], T[1], S[2]]   # hand planted (elbow irrelevant for balance)
        P[s+'el'] = [(S[0]+T[0])/2, (S[1]+T[1])/2, S[2]]
    return P
def mid(a, b): return [(a[i]+b[i])/2 for i in range(3)]
def com(P):
    parts = [(mid(P['hip'], P['neck']), 46), (P['head'], 8)]
    for s in 'lr':
        parts += [(mid(P[s+'hp'], P[s+'kn']), 10), (mid(P[s+'kn'], P[s+'an']), 4.5), (mid(P[s+'an'], P[s+'to']), 1.5),
                  (mid(P[s+'sh'], P[s+'el']), 3), (mid(P[s+'el'], P[s+'ha']), 2.5)]
    W = sum(w for _, w in parts)
    return [sum(p[i]*w for p, w in parts)/W for i in range(3)]
def nd(a):
    a = (a + 180) % 360 - 180
    return a
PROPS = {'wallSit'}
def check(name):
    p = resolve(name); q = normalize(p); P = solve(q); issues = []
    if q.get('lift'): return P, q, ['(airborne frame, skipped balance)']
    if name in PROPS: return P, q, ['(leans on a prop, skipped balance)']
    ax = 2 if q['v'] == 'f' else 0
    pts = [(k, P[k], RAD[r]) for k, r in PTS]
    for a, b in (('hip', 'mid'), ('mid', 'neck')):          # the torso surface can rest on the floor too
        for t in (0.25, 0.5, 0.75): pts.append((a + '-' + b, [P[a][i] + (P[b][i] - P[a][i]) * t for i in range(3)], 7))
    contacts = [k for k, p, r in pts if p[1] + r >= -4]
    c = com(P); xs = [p[ax] for k, p, r in pts if p[1] + r >= -4]
    lo, hi = min(xs) - 5, max(xs) + 5
    if not (lo <= c[ax] <= hi):
        issues.append(f'UNBALANCED: centre of mass {c[ax]:.0f} outside support {lo+5:.0f}..{hi-5:.0f} (contacts {contacts})')
    if q['v'] != 'f':
        for s in 'lr':
            kf = (q[s+'l1'] - q[s+'l2'] + 90) % 360 - 90
            if kf < -8 or kf > 182: issues.append(f'{s} knee bends wrong way/too far: flexion {kf:.0f}')
            if not q.get('ik') or s not in (q.get('ik') or {}):
                ef = nd(q[s+'a2'] - q[s+'a1'])
                if ef < -10 or ef > 160: issues.append(f'{s} elbow bends wrong way: flexion {ef:.0f}')
            hf = nd(q[s+'l1'] - (q['t1'] - 180))
            if hf < -60 or hf > 178: issues.append(f'{s} hip angle odd: flexion {hf:.0f}')
        sp = nd(q['t2'] - q['t1']); hd = nd(q['hd'] - q['t2'])
        if abs(sp) > 60: issues.append(f'spine bend {sp:.0f}')
        if abs(hd) > 110: issues.append(f'neck bend {hd:.0f}')
    return P, q, issues
names = sys.argv[2:] or list(D)
for n in names:
    P, q, iss = check(n)
    if iss or len(sys.argv) > 2:
        pts = {k: [round(P[k][0]), round(P[k][1])] for k in ['head', 'neck', 'hip', 'lkn', 'lan', 'lto', 'lha']}
        print(f'{n:14s}', '; '.join(iss) or 'ok', pts if len(sys.argv) > 2 else '')
