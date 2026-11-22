"""Frame-by-frame check of exercise reps (loop mode blends raw angles, like figure.js lerpK).
Flags in-between frames that topple, bend joints the wrong way, or drag a hand/foot along the floor.
Usage: python3 tools/check_reps.py .   (small drags < ~15 at lift-off and mid-step momentum are expected)"""
import sys, re, json, math, importlib.util, io, contextlib
root = sys.argv[1]
spec = importlib.util.spec_from_file_location('chk', root + '/tools/check_poses.py')
sys.argv = [sys.argv[0], root + '/js/poses.js', 'stand']
with contextlib.redirect_stdout(io.StringIO()):
    chk = importlib.util.module_from_spec(spec); spec.loader.exec_module(chk)
src = open(root + '/js/content.js').read()
EX = {}
for m in re.finditer(r"^\s{4}(\w+): \{ name: '([^']*)', frames: (\[\[.*?\]\])", src, re.M):
    EX[m.group(1)] = json.loads(m.group(3).replace("'", '"'))
NUM = ['t1', 't2', 'hd', 'la1', 'la2', 'ra1', 'ra2', 'll1', 'll2', 'rl1', 'rl2', 'lf', 'rf', 'lift', 'dx']
R = math.pi / 180
def twoLink(S, T, a, b, bend):
    dx, dy = T[0] - S[0], T[1] - S[1]; d = math.hypot(dx, dy); base = math.atan2(dx, dy) / R
    mv = lambda p, l, ang: [p[0] + l * math.sin(ang * R), p[1] + l * math.cos(ang * R)]
    if d >= a + b - 0.01:
        e = mv(S, a, base); return e, mv(e, b, base), base, base
    d = max(d, abs(a - b) + 0.01)
    A = math.acos(max(-1, min(1, (a*a + d*d - b*b) / (2*a*d)))) / R
    a1 = base - bend * A; e = mv(S, a, a1); a2 = math.atan2(T[0] - e[0], T[1] - e[1]) / R
    return e, mv(e, b, a2), a1, a2
def solve(q):
    """Exact port of figure.js solve(): rest on floor, plant IK hands, report IK arm angles."""
    P = chk.build(q); ik = q.get('ik') or {}
    floor = max(P[k][1] + chk.RAD[r] for k, r in chk.PTS if not (k[0] in ik and (k.endswith('el') or k.endswith('ha'))))
    sy = -floor - (q.get('lift') or 0); sx = q.get('dx') or 0
    for k in P: P[k] = [P[k][0] + sx, P[k][1] + sy, P[k][2]]
    out = dict(q)
    for s_ in 'lr':
        if s_ not in ik: continue
        S = P[s_ + 'sh']; e, h, a1, a2 = twoLink(S[:2], [S[0] + (ik[s_].get('dx') or 0), -chk.RAD['ha']], chk.L['ua'], chk.L['fa'], 1)
        P[s_ + 'el'] = [e[0], e[1], S[2]]; P[s_ + 'ha'] = [h[0], h[1], S[2]]; out[s_ + 'a1'] = a1; out[s_ + 'a2'] = a2
    return P, out
def prep(n):
    q = chk.normalize(chk.resolve(n)); P, out = solve(q); out['ik'] = q.get('ik'); return out
def lerpK(a, b, u):
    q = {'v': a['v'] if u < 0.5 else b['v']}
    for k in NUM: q[k] = (a.get(k) or 0) + ((b.get(k) or 0) - (a.get(k) or 0)) * u
    ik = None
    if a.get('ik') and b.get('ik'):
        for s in 'lr':
            if s in a['ik'] and s in b['ik']:
                ik = ik or {}; ik[s] = {'dx': (a['ik'][s].get('dx') or 0) * (1 - u) + (b['ik'][s].get('dx') or 0) * u}
    if ik: q['ik'] = ik
    return q
def com(P, ax): return chk.com(P)[ax]
def imbalance(P, v):
    ax = 2 if v == 'f' else 0
    pts = [(P[k], chk.RAD[r]) for k, r in chk.PTS]
    for a, b in (('hip', 'mid'), ('mid', 'neck')):
        for t in (0.25, 0.5, 0.75): pts.append(([P[a][i] + (P[b][i] - P[a][i]) * t for i in range(3)], 7))
    xs = [p[ax] for p, r in pts if p[1] + r >= -12]
    c = com(P, ax)
    return max(0, min(xs) - c, c - max(xs))
def joints(q):
    out = []
    if q['v'] == 'f': return out
    for s in 'lr':
        kf = (q[s+'l1'] - q[s+'l2'] + 90) % 360 - 90
        if kf < -10 or kf > 182: out.append(f'{s}-knee {kf:.0f}')
        if not (q.get('ik') and s in q['ik']):
            ef = (q[s+'a2'] - q[s+'a1'] + 180) % 360 - 180
            if ef < -15 or ef > 165: out.append(f'{s}-elbow {ef:.0f}')
        hf = (q[s+'l1'] - (q['t1'] - 180) + 180) % 360 - 180
        if hf < -60 or hf > 178: out.append(f'{s}-hip {hf:.0f}')
    sp = (q['t2'] - q['t1'] + 180) % 360 - 180
    if abs(sp) > 60: out.append(f'spine {sp:.0f}')
    return out
ease = lambda u: 0.5 - 0.5 * math.cos(math.pi * u)
only = sys.argv[2:] if False else None
ANCH = {m.group(1): m.group(2) for m in re.finditer(r"^\s{4}(\w+): \{ name: .*?anchor: '(\w+)'", src, re.M)}
AK = {'hip': 'hip', 'ltoe': 'lto', 'rtoe': 'rto', 'lhand': 'lha', 'rhand': 'rha'}
for ex, frames in EX.items():
    ak = AK.get(ANCH.get(ex, 'hip'), 'hip')
    probs = []
    n = len(frames)
    for i in range(n):
        a, b = frames[i], frames[(i + 1) % n]
        if a[2] <= 0 or n == 1: continue      # no blend (hold, or instant wrap)
        A, B = prep(a[0]), prep(b[0])
        worst = (0, None, None)
        for k in range(1, 10):
            u = ease(k / 10)
            q = lerpK(A, B, u); P, q = solve(q)
            lifted = q.get('lift', 0) > 0.5
            im = 0 if lifted else imbalance(P, q['v'])
            js = joints(q)
            if im > worst[0] or (js and not worst[2]): worst = (max(im, worst[0]), k / 10, js or worst[2])
        seg = AK.get(a[4], ak) if len(a) > 4 and a[4] else ak
        ax = 2 if A['v'] == 'f' else 0
        PA, _ = solve(A)
        # a part that is on the floor while it moves (relative to the pinned part) is being dragged
        for kk, r in chk.PTS:
            if kk == seg or kk[0] not in 'lr' or kk[1:] not in ('an', 'to', 'ha', 'kn'): continue
            if PA[kk][1] + chk.RAD[r] < -2: continue
            drag, prev = 0, PA[kk][ax] - PA[seg][ax]
            for k in range(1, 11):
                q = lerpK(A, B, ease(k / 10)); P, _ = solve(q)
                if P[kk][1] + chk.RAD[r] >= -1.5:
                    x = P[kk][ax] - P[seg][ax]
                    if prev is not None: drag += abs(x - prev)   # slid while staying on the floor
                    prev = x
                else:
                    prev = None
            if drag > 6: probs.append(f"  {a[0]} → {b[0]}: {kk} drags {drag:.0f} along the floor")
        if worst[0] > 12 or worst[2]:
            probs.append(f"  {a[0]} → {b[0]}: off-balance {worst[0]:.0f} at {worst[1]}" + (f"; joints {worst[2]}" if worst[2] else ''))
    print(f"{ex}: {'OK' if not probs else ''}")
    for p in probs: print(p)
