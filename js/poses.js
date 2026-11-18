/* Prana — pose library (angles; see figure.js for the convention).
 * `b` = base pose to inherit from. `anchor` = body point that stays planted
 * when transitioning into this pose during a flow. */
(function () {
  'use strict';
  const D = {
    // ---- Standing ----------------------------------------------------------
    stand: { lf: 90, rf: 90, anchor: 'lto' },
    standF: { v: 'f', la1: -8, la2: -6, ra1: 8, ra2: 6, ll1: -3, ll2: -2, rl1: 3, rl2: 2, anchor: 'hip' },
    standWide: { v: 'f', la1: -8, la2: -6, ra1: 8, ra2: 6, ll1: -14, ll2: -14, rl1: 14, rl2: 14 },

    // squat
    squatUp: { b: 'stand', la1: 15, la2: 20, ra1: 18, ra2: 24 },
    squatDown: { t1: 140, t2: 145, hd: 155, la1: 88, la2: 88, ra1: 92, ra2: 92, ll1: 78, ll2: -25, rl1: 82, rl2: -25, lf: 90, rf: 90 },
    jumpUp: { b: 'stand', la1: 175, la2: 178, ra1: 178, ra2: 182, lift: 22, lf: 30, rf: 30 },

    // lunges
    lungeDown: { t1: 180, la1: -8, la2: -6, ra1: 8, ra2: 10, rl1: 90, rl2: 0, rf: 90, ll1: -35, ll2: -98, lf: 15 },
    sideLungeR: { v: 'f', t1: 172, hd: 174, la1: 20, la2: 160, ra1: -20, ra2: -160, rl1: 60, rl2: -5, ll1: -42, ll2: -42 },
    sideLungeL: { v: 'f', t1: 188, hd: 186, la1: 20, la2: 160, ra1: -20, ra2: -160, ll1: -60, ll2: 5, rl1: 42, rl2: 42 },

    // planks & push-ups
    plankHigh: { t1: 110, hd: 115, ll1: -69, ll2: -69, rl1: -71, rl2: -71, ik: { l: { dx: -2 }, r: { dx: 2 } }, anchor: 'rha' },
    pushDown: { t1: 98, hd: 102, ll1: -82, ll2: -82, rl1: -82, rl2: -82, ik: { l: { dx: -11 }, r: { dx: -8 } } },
    plankLow: { t1: 96.5, hd: 100, ll1: -83.5, ll2: -83.5, rl1: -83.5, rl2: -83.5, la1: 0, la2: 90, ra1: 3, ra2: 90 },
    sidePlank: { v: 'f', t1: 116, hd: 118, la1: 178, la2: 180, ra1: 0, ra2: 0, ll1: -62, ll2: -62, rl1: -64, rl2: -64, ik: { r: { dx: 0 } } },
    mcR: { b: 'plankHigh', rl1: 80, rl2: -65 },
    mcL: { b: 'plankHigh', ll1: 80, ll2: -65 },
    crouch: { t1: 128, t2: 132, hd: 140, ll1: 108, ll2: -25, rl1: 112, rl2: -25, lf: 90, rf: 90, ik: { l: { dx: 8 }, r: { dx: 12 } } },

    // lying on back (head to the left)
    hook: { t1: -90, hd: -90, la1: 90, la2: 90, ra1: 90, ra2: 90, ll1: 128, ll2: -24, rl1: 132, rl2: -24, lf: 90, rf: 90, anchor: 'hip' },
    crunchUp: { b: 'hook', t1: -95, t2: -125, hd: -140, la1: 105, la2: 105, ra1: 100, ra2: 100 },
    bridgeUp: { b: 'hook', t1: -110, hd: -100, ll1: 103, ll2: -29, rl1: 107, rl2: -29, la1: 70, la2: 90, ra1: 70, ra2: 90, anchor: 'lto' },
    lieBack: { t1: -90, hd: -90, la1: 86, la2: 88, ra1: 88, ra2: 90, ll1: 90, ll2: 90, rl1: 90, rl2: 90, anchor: 'hip' },
    legsUp: { b: 'lieBack', ll1: 178, ll2: 178, rl1: 180, rl2: 180 },
    flutterA: { b: 'lieBack', ll1: 104, ll2: 104, rl1: 120, rl2: 120 },
    flutterB: { b: 'lieBack', ll1: 120, ll2: 120, rl1: 104, rl2: 104 },

    // lying face down (head to the right)
    prone: { t1: 90, hd: 92, la1: 90, la2: 90, ra1: 92, ra2: 92, ll1: -90, ll2: -90, rl1: -90, rl2: -90, lf: -90, rf: -90, anchor: 'hip' },
    superman: { b: 'prone', t1: 93, t2: 106, hd: 110, la1: 106, la2: 108, ra1: 104, ra2: 106, ll1: -100, ll2: -102, rl1: -101, rl2: -103, lf: -102, rf: -103 },

    // misc conditioning
    wallSit: { t1: 180, la1: 30, la2: 95, ra1: 34, ra2: 98, ll1: 88, ll2: 0, rl1: 92, rl2: 0, lf: 90, rf: 90 },
    calfDown: { b: 'stand' },
    calfUp: { b: 'stand', lf: 35, rf: 35 },
    hkA: { la1: 55, la2: 150, ra1: -35, ra2: 15, rl1: 95, rl2: 0, rf: 90, ll1: -4, ll2: -2, lf: 90, lift: 4 },
    hkB: { ra1: 55, ra2: 150, la1: -35, la2: 15, ll1: 95, ll2: 0, lf: 90, rl1: -4, rl2: -2, rf: 90, lift: 4 },
    marchA: { la1: 30, la2: 80, ra1: -20, ra2: 0, rl1: 70, rl2: -5, rf: 90, ll1: -2, ll2: -2, lf: 90 },
    marchB: { ra1: 30, ra2: 80, la1: -20, la2: 0, ll1: 70, ll2: -5, lf: 90, rl1: -2, rl2: -2, rf: 90 },
    jjClosed: { b: 'standF' },
    jjMid: { v: 'f', la1: -80, la2: -85, ra1: 80, ra2: 85, ll1: -12, ll2: -12, rl1: 12, rl2: 12, lift: 12 },
    jjOpen: { v: 'f', la1: -145, la2: -162, ra1: 145, ra2: 162, ll1: -20, ll2: -20, rl1: 20, rl2: 20 },
    ac0: { b: 'stand', la1: -15, la2: -15, ra1: 0, ra2: 0 },
    ac90: { b: 'stand', la1: 75, la2: 75, ra1: 90, ra2: 90 },
    ac180: { b: 'stand', la1: 165, la2: 165, ra1: 180, ra2: 180 },
    ac270: { b: 'stand', la1: 255, la2: 255, ra1: 270, ra2: 270 },
    ac360: { b: 'stand', la1: 345, la2: 345, ra1: 360, ra2: 360 },
    sideBendR: { v: 'f', t1: 178, t2: 160, hd: 155, la1: 160, la2: 135, ra1: 12, ra2: 8, ll1: -4, ll2: -3, rl1: 4, rl2: 3 },
    sideBendL: { v: 'f', t1: 182, t2: 200, hd: 205, ra1: -160, ra2: -135, la1: -12, la2: -8, ll1: -4, ll2: -3, rl1: 4, rl2: 3 },
    hinge: { t1: 98, hd: 104, ll1: 8, ll2: 8, rl1: 10, rl2: 10, lf: 90, rf: 90, la1: 2, la2: 4, ra1: 4, ra2: 6 },
    table: { t1: 96, hd: 100, ll1: -2, ll2: -90, rl1: 2, rl2: -90, lf: -90, rf: -90, ik: { l: { dx: -1 }, r: { dx: 2 } }, anchor: 'rha' },
    birdDog: { t1: 96, hd: 100, ll1: -88, ll2: -88, lf: -88, rl1: 2, rl2: -90, rf: -90, ra1: 94, ra2: 94, ik: { l: { dx: -1 } } },

    // ---- Yoga -----------------------------------------------------------------
    pranam: { b: 'stand', la1: 28, la2: 150, ra1: 25, ra2: 148, ll1: 0, ll2: 0, rl1: 0, rl2: 0 },
    upSalute: { t1: 182, t2: 194, hd: 198, la1: 190, la2: 194, ra1: 188, ra2: 192, ll1: 0, ll2: 0, rl1: 0, rl2: 0, lf: 90, rf: 90, anchor: 'lto' },
    fold: { t1: 40, t2: 15, hd: 5, ll1: 8, ll2: 8, rl1: 9, rl2: 9, lf: 90, rf: 90, ik: { l: { dx: 6 }, r: { dx: 10 } }, anchor: 'lto' },
    halfLift: { t1: 96, hd: 102, ll1: 8, ll2: 8, rl1: 9, rl2: 9, lf: 90, rf: 90, la1: 2, la2: 4, ra1: 4, ra2: 6, anchor: 'lto' },
    lowLungeR: { t1: 105, t2: 125, hd: 155, ll1: 100, ll2: -25, lf: 90, rl1: -48, rl2: -90, rf: -90, ik: { l: { dx: 2 }, r: { dx: 5 } }, anchor: 'lto' },
    lowLungeL: { t1: 105, t2: 125, hd: 155, rl1: 100, rl2: -25, rf: 90, ll1: -48, ll2: -90, lf: -90, ik: { l: { dx: 2 }, r: { dx: 5 } }, anchor: 'rto' },
    crescent: { t1: 178, t2: 190, hd: 194, rl1: 100, rl2: -25, rf: 90, ll1: -48, ll2: -90, lf: -90, la1: 185, la2: 190, ra1: 183, ra2: 188, anchor: 'rto' },
    plank: { b: 'plankHigh' },
    ashtanga: { t1: 50, t2: 25, hd: 100, ll1: -20, ll2: -90, rl1: -18, rl2: -90, lf: -90, rf: -90, ik: { l: { dx: 1 }, r: { dx: 4 } }, anchor: 'rha' },
    cobra: { t1: 102, t2: 146, hd: 160, ll1: -90, ll2: -90, rl1: -90, rl2: -90, lf: -90, rf: -90, ik: { l: { dx: -6 }, r: { dx: -3 } }, anchor: 'rha' },
    downDog: { t1: 45, hd: 35, ll1: -30, ll2: -30, rl1: -29, rl2: -29, lf: 90, rf: 90, la1: 45, la2: 45, ra1: 46, ra2: 46, anchor: 'rha' },
    child: { t1: 75, hd: 85, ll1: 60, ll2: -100, rl1: 62, rl2: -100, lf: -90, rf: -90, la1: 70, la2: 90, ra1: 72, ra2: 92, anchor: 'lkn' },
    vajrasana: { t1: 180, ll1: 90, ll2: -90, rl1: 92, rl2: -90, lf: -90, rf: -90, la1: 15, la2: 80, ra1: 18, ra2: 82, anchor: 'lkn' },
    cow: { b: 'table', t1: 80, t2: 112, hd: 140 },
    cat: { b: 'table', t1: 112, t2: 76, hd: 35 },
    bridge: { b: 'bridgeUp', t1: -112, la1: 75, la2: 90, ra1: 75, ra2: 90 },
    staff: { t1: 180, ll1: 90, ll2: 90, rl1: 90, rl2: 90, ik: { l: { dx: -4 }, r: { dx: -2 } }, anchor: 'hip' },
    seatedFold: { t1: 125, t2: 105, hd: 100, ll1: 90, ll2: 90, rl1: 90, rl2: 90, la1: 100, la2: 95, ra1: 98, ra2: 93, anchor: 'hip' },
    boat: { t1: -148, t2: -152, hd: -158, ll1: 128, ll2: 128, rl1: 130, rl2: 130, la1: 88, la2: 90, ra1: 90, ra2: 92, anchor: 'hip' },
    bow: { t1: 105, t2: 150, hd: 160, ll1: -125, ll2: 145, rl1: -123, rl2: 147, la1: -125, la2: -125, ra1: -123, ra2: -123, anchor: 'hip' },
    savasana: { b: 'lieBack', la1: 84, la2: 88, ra1: 86, ra2: 90 },
    sukhasana: { v: 'f', t1: 180, ll1: -96, ll2: 85, rl1: 96, rl2: -85, lf: 120, rf: -120, la1: -35, la2: -35, ra1: 35, ra2: 35, anchor: 'hip' },
    tree: { v: 'f', t1: 180, ll1: -1, ll2: 0, rl1: 50, rl2: -62, rf: -100, la1: 160, la2: 165, ra1: -160, ra2: -165, anchor: 'lto' },
    warrior1: { t1: 180, hd: 186, rl1: 80, rl2: 0, rf: 90, ll1: -54, ll2: -54, lf: 80, la1: 178, la2: 182, ra1: 182, ra2: 186, anchor: 'rto' },
    warrior2: { v: 'f', t1: 180, rl1: 80, rl2: 0, ll1: -55, ll2: -55, la1: -90, la2: -90, ra1: 90, ra2: 90, anchor: 'hip' },
    triangle: { v: 'f', t1: 126, t2: 122, hd: 118, ll1: -30, ll2: -30, rl1: 30, rl2: 30, la1: 178, la2: 178, ra1: 2, ra2: 2, anchor: 'hip' },
    chair: { t1: 158, t2: 162, hd: 165, ll1: 50, ll2: -15, rl1: 52, rl2: -15, lf: 90, rf: 90, la1: 165, la2: 166, ra1: 167, ra2: 168, anchor: 'lto' },
    dancer: { t1: 128, t2: 130, hd: 135, ll1: 0, ll2: 0, lf: 90, rl1: -140, rl2: 150, ra1: -132, ra2: -132, la1: 138, la2: 140, anchor: 'lto' },
    shoulderStand: { t1: 5, hd: -100, ll1: 180, ll2: 180, rl1: 182, rl2: 182, la1: 75, la2: -150, ra1: 77, ra2: -148, anchor: 'head' }
  };

  function resolve(name, seen) {
    const d = D[name];
    if (!d) throw new Error('Unknown pose: ' + name);
    if (!d.b) return Object.assign({}, d);
    seen = seen || {};
    if (seen[name]) throw new Error('Pose cycle: ' + name);
    seen[name] = true;
    const o = Object.assign({}, resolve(d.b, seen), d);
    delete o.b;
    return o;
  }

  window.Poses = { get: resolve, names: () => Object.keys(D) };
})();
