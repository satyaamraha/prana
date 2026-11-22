"""Frame-by-frame check of yoga flows and Surya Namaskar (show mode in figure.js).

Ports the app's transition logic — joint-space blending (lerpJ), the morph-or-cross-fade
decision (canMorph) and anchoring — and walks every move between poses, flagging
in-between frames that bend a joint the wrong way, topple, or drag a hand/foot along
the floor. Cross-faded moves have no in-between frames, so they are only listed.

Usage: python3 tools/check_flows.py .        (add -v to list every move)
"""
import sys, re, json, math, importlib.util, io, contextlib

root = sys.argv[1] if len(sys.argv) > 1 else '.'
VERBOSE = '-v' in sys.argv
spec = importlib.util.spec_from_file_location('chk', root + '/tools/check_poses.py')
_argv = sys.argv
sys.argv = ['x', root + '/js/poses.js', 'stand']
with contextlib.redirect_stdout(io.StringIO()):
    chk = importlib.util.module_from_spec(spec); spec.loader.exec_module(chk)
sys.argv = _argv

R = math.pi / 180
NUM = ['t1', 't2', 'hd', 'la1', 'la2', 'ra1', 'ra2', 'll1', 'll2', 'rl1', 'rl2', 'lf', 'rf', 'lift', 'dx']
ANCHOR = {'hip': 'hip', 'ltoe': 'lto', 'rtoe': 'rto', 'lhand': 'lha', 'rhand': 'rha', 'lto': 'lto', 'rto': 'rto',
          'lha': 'lha', 'rha': 'rha', 'head': 'head', 'lkn': 'lkn', 'rkn': 'rkn'}
ease = lambda u: 0.5 - 0.5 * math.cos(math.pi * u)
lerp = lambda a, b, u: a + (b - a) * u


def two_link(S, T, a, b, bend):
    dx, dy = T[0] - S[0], T[1] - S[1]; d = math.hypot(dx, dy); base = math.atan2(dx, dy) / R
    mv = lambda p, l, ang: [p[0] + l * math.sin(ang * R), p[1] + l * math.cos(ang * R)]
    if d >= a + b - 0.01:
        e = mv(S, a, base); return e, mv(e, b, base), base, base
    d = max(d, abs(a - b) + 0.01)
    A = math.acos(max(-1, min(1, (a * a + d * d - b * b) / (2 * a * d)))) / R
    a1 = base - bend * A; e = mv(S, a, a1); a2 = math.atan2(T[0] - e[0], T[1] - e[1]) / R
    return e, mv(e, b, a2), a1, a2


def solve(q):
    """Port of figure.js solve(): rest on the floor, plant IK hands, report IK arm angles."""
    P = chk.build(q); ik = q.get('ik') or {}
    floor = max(P[k][1] + chk.RAD[r] for k, r in chk.PTS if not (k[0] in ik and (k.endswith('el') or k.endswith('ha'))))
    sy = -floor - (q.get('lift') or 0); sx = q.get('dx') or 0
    for k in P: P[k] = [P[k][0] + sx, P[k][1] + sy, P[k][2]]
    out = dict(q)
    for s in 'lr':
        if s not in ik: continue
        S = P[s + 'sh']
        e, h, a1, a2 = two_link(S[:2], [S[0] + (ik[s].get('dx') or 0), -chk.RAD['ha']], chk.L['ua'], chk.L['fa'], 1)
        P[s + 'el'] = [e[0], e[1], S[2]]; P[s + 'ha'] = [h[0], h[1], S[2]]; out[s + 'a1'] = a1; out[s + 'a2'] = a2
    return P, out


def prep(name):
    pose = chk.resolve(name); q = chk.normalize(pose); P, out = solve(q)
    out['ik'] = q.get('ik')
    return {'q': out, 'P': P, 'v': q['v'], 'ik': q.get('ik'), 'anchor': pose.get('anchor')}


def lerpK(A, B, u):
    q = {'v': A['v'] if u < 0.5 else B['v']}
    for k in NUM: q[k] = lerp(A['q'].get(k) or 0, B['q'].get(k) or 0, u)
    ik = None
    if A['ik'] and B['ik']:
        for s in 'lr':
            if s in A['ik'] and s in B['ik']:
                ik = ik or {}; ik[s] = {'dx': lerp(A['ik'][s].get('dx') or 0, B['ik'][s].get('dx') or 0, u)}
    q['ik'] = ik
    return q


def wrap_to(a, lo):
    x = (a - lo) % 360
    return x + lo


JOINTS = [('t2', 't1', -180, None), ('hd', 't2', -180, None),
          ('la1', 't2', -120, 'L'), ('ra1', 't2', -120, 'R'), ('la2', 'la1', -90, None), ('ra2', 'ra1', -90, None),
          ('ll1', 't1', -270, None), ('rl1', 't1', -270, None), ('ll2', 'll1', -270, None), ('rl2', 'rl1', -270, None),
          ('lf', 'll2', -60, None), ('rf', 'rl2', -60, None)]


def to_joints(q):
    J = {'t1': q['t1']}
    for k, par, lo, side in JOINTS:
        rel = (q.get(k) or 0) - (q.get(par) or 0)
        if side:
            rel += 180
            if q['v'] == 'f' and side == 'L': rel = -rel
        J[k] = wrap_to(rel, lo)
    return J


def lerpJ(A, B, u, arc=None):
    q = lerpK(A, B, u)
    a, b = to_joints(A['q']), to_joints(B['q'])
    q['t1'] = a['t1'] + wrap_to(b['t1'] - a['t1'], -180) * u
    for k, par, _, side in JOINTS:
        rel = lerp(a[k], b[k], u)
        if side:
            if q['v'] == 'f' and side == 'L': rel = -rel
            rel -= 180
        q[k] = q[par] + rel
    if arc:
        bump = min(1, 2.5 * math.sin(math.pi * u))
        for s in 'lr':
            if s not in arc: continue
            hip_flex = wrap_to(q[s + 'l1'] - q['t1'] + 180, -90); knee_flex = wrap_to(q[s + 'l1'] - q[s + 'l2'], -90)
            lift = min(35, max(0, 165 - hip_flex)) * bump
            bend = min(70, max(0, 175 - knee_flex)) * bump
            q[s + 'l1'] += lift; q[s + 'l2'] += lift - bend; q[s + 'f'] += lift - bend
    return q


def step_arcs(A, B, key):
    if A['v'] != 's' or B['v'] != 's': return None
    dx = A['P'][key][0] - B['P'][key][0]
    down = lambda P, s: P[s + 'an'][1] + chk.RAD['an'] >= -2 or P[s + 'to'][1] + chk.RAD['to'] >= -2
    arc = set()
    for s in 'lr':
        if key in (s + 'to', s + 'an'): continue
        if down(A['P'], s) and down(B['P'], s) and abs(B['P'][s + 'an'][0] + dx - A['P'][s + 'an'][0]) > 25: arc.add(s)
    return arc or None


def support_of(P):
    on = lambda k, r: P[k][1] + chk.RAD[r] >= -4
    g = set()
    if on('lan', 'an') or on('lto', 'to') or on('ran', 'an') or on('rto', 'to'): g.add('feet')
    if on('lkn', 'kn') or on('rkn', 'kn'): g.add('knees')
    if on('lha', 'ha') or on('rha', 'ha'): g.add('hands')
    return g, on('hip', 'hip') or on('mid', 'mid')


def imbalance(P, v):
    ax = 2 if v == 'f' else 0
    c = chk.com(P)[ax]
    xs = []
    for k, r in chk.PTS:
        if P[k][1] + chk.RAD[r] >= -12: xs.append(P[k][ax])
    for t in (0.25, 0.5, 0.75):
        for a, b in (('hip', 'mid'), ('mid', 'neck')):
            if lerp(P[a][1], P[b][1], t) + 7 >= -12: xs.append(lerp(P[a][ax], P[b][ax], t))
    return max(0, min(xs) - c, c - max(xs))


MORPH_TOL = 40


SLIDE_MAX = {'an': 30, 'kn': 30, 'ha': 30, 'to': 45}


def can_morph(A, B, arc=None, key='hip'):
    face = lambda K: 90 if K['v'] == 'f' else abs(wrap_to(K['q']['t1'] - 90, -180))
    fa, fb = face(A), face(B)
    up, down = (lambda f: f >= 120), (lambda f: f <= 60)
    if (up(fa) and down(fb)) or (down(fa) and up(fb)): return False, 'rolls over'
    (ga, pa), (gb, pb) = support_of(A['P']), support_of(B['P'])
    shared = len(ga & gb)
    on_back = up(fa) and up(fb)
    if not on_back and not (shared >= 2 or (shared >= 1 and pa == pb)): return False, 'support changes'
    for u in (0.25, 0.5, 0.75):
        if imbalance(solve(lerpJ(A, B, ease(u), arc))[0], A['v']) > MORPH_TOL: return False, 'would topple'
    ax = 2 if A['v'] == 'f' else 0
    pin = A['P'][key][ax]
    parts = [(k, r) for k, r in chk.PTS if k[0] in 'lr' and k[1:] in SLIDE_MAX]
    last = {k: A['P'][k][ax] for k, r in parts if A['P'][k][1] + chk.RAD[r] >= -1.5}
    slid = {}
    for i in range(1, 11):
        P = solve(lerpJ(A, B, ease(i / 10), arc))[0]; shift = pin - P[key][ax]
        for k, r in parts:
            if P[k][1] + chk.RAD[r] >= -1.5:
                x = P[k][ax] + shift
                if k in last:
                    slid[k] = slid.get(k, 0) + abs(x - last[k])
                    if slid[k] > SLIDE_MAX[k[1:]]: return False, f'{k} would slide'
                last[k] = x
            else:
                last.pop(k, None)
    return True, ''


def joint_issues(q):
    out = []
    if q['v'] == 'f': return out
    for s in 'lr':
        kf = (q[s + 'l1'] - q[s + 'l2'] + 90) % 360 - 90
        if kf < -10 or kf > 182: out.append(f'{s}-knee {kf:.0f}')
        if not (q.get('ik') and s in q['ik']):
            ef = (q[s + 'a2'] - q[s + 'a1'] + 180) % 360 - 180
            if ef < -15 or ef > 165: out.append(f'{s}-elbow {ef:.0f}')
        hf = (q[s + 'l1'] - (q['t1'] - 180) + 180) % 360 - 180
        if hf < -60 or hf > 178: out.append(f'{s}-hip {hf:.0f}')
    sp = (q['t2'] - q['t1'] + 180) % 360 - 180
    if abs(sp) > 60: out.append(f'spine {sp:.0f}')
    return out


def check_move(a, b, anchor_b):
    """a, b: pose names. Returns (kind, problems)."""
    A, B = prep(a), prep(b)
    if A['v'] != B['v']: return 'cut (view plane changes)', []
    key = ANCHOR.get(anchor_b or B['anchor'] or 'hip', 'hip')
    arc = step_arcs(A, B, key)
    ok, why = can_morph(A, B, arc, key)
    if not ok: return f'cross-fade ({why})', []
    ax = 2 if A['v'] == 'f' else 0
    WA = [0.0, 0.0]
    WB = [WA[0] + A['P'][key][0] - B['P'][key][0], WA[1] + A['P'][key][2] - B['P'][key][2]]
    world = lambda P, W, k: P[k][0] + W[0] if ax == 0 else P[k][2] + W[1]
    probs, worst_im, drag = [], 0, {}
    last = {k: world(A['P'], WA, k) for k, r in chk.PTS if A['P'][k][1] + chk.RAD[r] >= -1.5}   # parts on the floor
    for i in range(1, 21):
        u = ease(i / 20)
        q = lerpJ(A, B, u, arc); P, q2 = solve(q)
        W = [A['P'][key][0] - P[key][0], A['P'][key][2] - P[key][2]]   # anchor pinned every frame
        for j in joint_issues(q2):
            if j not in probs: probs.append(j)
        worst_im = max(worst_im, imbalance(P, q['v']))
        for k, r in chk.PTS:
            if k[0] not in 'lr' or k[1:] not in ('an', 'to', 'ha', 'kn'): continue
            if P[k][1] + chk.RAD[r] >= -1.5:                    # on the floor in this frame
                x = world(P, W, k)
                if k in last: drag[k] = drag.get(k, 0) + abs(x - last[k])   # slid since the previous frame
                last[k] = x
            else:
                last.pop(k, None)                               # lifted: a new touch-down starts fresh
    if worst_im > 20: probs.append(f'off-balance {worst_im:.0f}')
    for k, d in drag.items():
        if d > 10: probs.append(f'{k} drags {d:.0f}')
    return 'morph' + (f' (steps: {"+".join(sorted(arc))} foot)' if arc else ''), probs


def moves():
    src = open(root + '/js/content.js').read()
    yoga = {m.group(1): m.group(2) for m in re.finditer(r"\{ id: '(\w+)', pose: '(\w+)'", src)}
    frames = {m.group(1) for m in re.finditer(r"\{ id: '(\w+)', pose: '\w+'[^\n]*flowFrames", src)}
    sides = {m.group(1) for m in re.finditer(r"\{ id: '(\w+)', pose: '\w+'[^\n]*sides: true", src)}
    surya = []
    for side in 'RL':
        back, fwd = ('lowLungeR', 'lowLungeL') if side == 'R' else ('lowLungeL', 'lowLungeR')
        ft = lambda p: 'lto' if p == 'lowLungeR' else 'rto'
        surya += [('pranam', 'lto'), ('upSalute', 'lto'), ('fold', 'lto'), (back, ft(back)), ('plank', 'rha'), ('ashtanga', 'rha'),
                  ('cobra', 'rha'), ('downDog', 'rha'), (fwd, 'rha'), ('fold', ft(fwd)), ('upSalute', 'lto'), ('stand', 'lto')]
    yield 'surya', [('stand', 'lto')] + surya + [('stand', 'lto')] + surya[:1]
    for m in re.finditer(r"\{ id: '(\w+)', name: '[^']*', tag: [^\n]*\n\s*items: (\[\[.*?\]\])", src):
        items = json.loads(m.group(2).replace("'", '"'))
        seq = []
        for yid, _ in items:
            if yid in frames: seq.append(('(loop:' + yid + ')', None)); continue
            seq.append((yoga[yid], None))
            if yid in sides: seq.append((yoga[yid] + '*flip', None))
        yield m.group(1), seq


seen = set()
for flow, seq in moves():
    print(f'{flow}:')
    for (a, _), (b, anc) in zip(seq, seq[1:]):
        if a == b or (a, b) in seen: continue
        seen.add((a, b))
        if a.startswith('(') or b.startswith('('):
            if VERBOSE: print(f'  {a} → {b}: cut (looping demo)')
            continue
        if a.endswith('*flip') or b.endswith('*flip'):
            if VERBOSE: print(f'  {a} → {b}: cross-fade (other side)')
            continue
        kind, probs = check_move(a, b, anc)
        if probs or VERBOSE: print(f'  {a} → {b}: {kind}' + (f' — {"; ".join(probs)}' if probs else ''))
