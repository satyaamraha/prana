/* Prana — practice content. */
(function () {
  'use strict';

  // ===========================================================================
  // Breathing exercises
  // phase tuple: [kind, seconds, label?]   kinds: in, in2, hold, out, holdOut
  // ===========================================================================
  const BREATHS = [
    {
      id: 'box', name: 'Box Breathing', tag: 'Steady focus under pressure', cat: 'focus', level: 'Beginner', minutes: 4,
      phases: [['in', 4], ['hold', 4], ['out', 4], ['holdOut', 4]],
      about: 'Four equal sides — inhale, hold, exhale, hold. Used by athletes and first responders to stay composed and clear-headed.',
      steps: ['Sit tall with relaxed shoulders. Breathe through your nose.', 'Inhale for 4 counts, filling the belly then the chest.', 'Hold gently for 4 — no strain in the throat.', 'Exhale smoothly for 4, then rest empty for 4.'],
      benefits: ['Calms the stress response', 'Sharpens attention', 'Steadies heart rate']
    },
    {
      id: '478', name: '4-7-8 Relaxing Breath', tag: 'A natural tranquilliser for sleep', cat: 'sleep', level: 'Beginner', minutes: 3,
      phases: [['in', 4], ['hold', 7], ['out', 8, 'Exhale — whoosh']],
      about: 'A long hold and an even longer exhale strongly activate the parasympathetic "rest and digest" system. Great in bed or before a stressful moment.',
      steps: ['Rest the tip of your tongue behind your upper front teeth.', 'Inhale quietly through the nose for 4.', 'Hold for 7.', 'Exhale through the mouth with a soft whoosh for 8.'],
      benefits: ['Helps you fall asleep', 'Eases anxiety', 'Slows a racing mind'],
      caution: 'Light-headedness is common at first. Start with 4 cycles and build up.'
    },
    {
      id: 'coherent', name: 'Coherent Breathing', tag: 'Resonance breathing for balance', cat: 'balance', level: 'Beginner', minutes: 5,
      phases: [['in', 5.5], ['out', 5.5]],
      about: 'About 5.5 breaths per minute — the "resonant" rate at which heart-rate variability peaks. Smooth, equal, and effortless.',
      steps: ['Breathe through the nose, softly and silently.', 'Inhale for 5.5 seconds, letting the belly expand.', 'Exhale for 5.5 seconds without pausing.', 'Let one breath roll into the next like a wave.'],
      benefits: ['Raises heart-rate variability', 'Balances mood', 'Improves emotional regulation']
    },
    {
      id: 'sigh', name: 'Physiological Sigh', tag: 'Fastest real-time calm-down', cat: 'calm', level: 'Beginner', minutes: 2,
      phases: [['in', 2.5, 'Inhale deeply'], ['in2', 1, 'Sip in a little more'], ['out', 6, 'Long, slow exhale']],
      about: 'A double inhale re-inflates the tiny air sacs in your lungs and the long exhale offloads carbon dioxide — the quickest known way to lower stress in real time.',
      steps: ['Inhale through the nose.', 'At the top, take one more short sip of air.', 'Exhale slowly and fully through the mouth.', 'Repeat 1–3 minutes, or just 2–3 times when stressed.'],
      benefits: ['Rapid stress relief', 'Reduces anxiety', 'Works in seconds']
    },
    {
      id: 'nadi', name: 'Nadi Shodhana', sub: 'Alternate Nostril Breathing', tag: 'Balance the left and right', cat: 'balance', level: 'Beginner', minutes: 5,
      phases: [['in', 4, 'Inhale left'], ['hold', 4], ['out', 6, 'Exhale right'], ['in', 4, 'Inhale right'], ['hold', 4], ['out', 6, 'Exhale left']],
      about: 'A classic pranayama that alternates the flow of breath between nostrils, traditionally used to balance the nervous system before meditation.',
      steps: ['Sit tall. Rest your left hand on your knee.', 'Use the right thumb to close the right nostril, ring finger for the left.', 'Inhale left, close both and hold, exhale right.', 'Inhale right, hold, exhale left. That is one round.'],
      benefits: ['Calms and centres', 'Improves focus', 'Prepares for meditation'],
      caution: 'Skip the holds if you are pregnant or have high blood pressure.'
    },
    {
      id: 'bhramari', name: 'Bhramari', sub: 'Humming Bee Breath', tag: 'Hum the noise away', cat: 'calm', level: 'Beginner', minutes: 3,
      phases: [['in', 4], ['out', 8, 'Hum “mmmm”']],
      about: 'Exhaling with a gentle hum creates a soothing vibration and lengthens the out-breath. Humming also boosts nitric oxide in the sinuses.',
      steps: ['Close your eyes; you may cover your ears with your thumbs.', 'Inhale through the nose.', 'Exhale making a steady, low “mmmm” like a bee.', 'Feel the vibration in your face and head.'],
      benefits: ['Quietens mental chatter', 'Relieves tension', 'Soothes before sleep']
    },
    {
      id: 'ujjayi', name: 'Ujjayi', sub: 'Ocean Breath', tag: 'The yogi’s focusing breath', cat: 'focus', level: 'Intermediate', minutes: 5,
      phases: [['in', 5, 'Inhale — ocean sound'], ['out', 6, 'Exhale — ocean sound']],
      about: 'A slight narrowing at the back of the throat makes a soft ocean sound, slowing the breath and anchoring attention. Used throughout vinyasa yoga.',
      steps: ['Breathe through the nose.', 'Gently constrict the back of the throat as if fogging a mirror.', 'Keep the ocean sound smooth on both inhale and exhale.', 'Let the sound be audible to you, not the room.'],
      benefits: ['Builds focus', 'Warms the body', 'Regulates pace during yoga']
    },
    {
      id: 'extended', name: 'Extended Exhale', tag: 'Downshift after a hard day', cat: 'calm', level: 'Beginner', minutes: 4,
      phases: [['in', 4], ['out', 7]],
      about: 'Making the exhale longer than the inhale slows the heart and signals safety to the nervous system. Simple and effective anywhere.',
      steps: ['Inhale through the nose for 4.', 'Exhale slowly through the nose or pursed lips for 7.', 'Keep shoulders loose, jaw unclenched.'],
      benefits: ['Lowers heart rate', 'Eases tension', 'Easy to do anywhere']
    },
    {
      id: 'triangle', name: 'Triangle Breathing', tag: 'Gentle focus primer', cat: 'focus', level: 'Beginner', minutes: 3,
      phases: [['in', 4], ['hold', 4], ['out', 4]],
      about: 'Three equal sides — a softer cousin of box breathing that is easy for beginners.',
      steps: ['Inhale for 4.', 'Hold for 4.', 'Exhale for 4.'],
      benefits: ['Builds breath control', 'Improves concentration']
    },
    {
      id: 'sleep', name: 'Sleep Descent', tag: 'Slows you gradually toward sleep', cat: 'sleep', level: 'Beginner', minutes: 8,
      stages: [{ phases: [['in', 4], ['out', 4]], minutes: 2 }, { phases: [['in', 4], ['out', 6]], minutes: 3 }, { phases: [['in', 4], ['out', 8]], minutes: 3 }],
      about: 'Starts at an easy rhythm and gradually lengthens the exhale so your body can follow it into rest. Best done lying down with the lights off.',
      steps: ['Lie down and get comfortable.', 'Follow the orb — the exhale grows longer every few minutes.', 'If you drift off, that is a success.'],
      benefits: ['Prepares body for sleep', 'Reduces night-time rumination']
    },
    {
      id: 'kapalabhati', name: 'Kapalabhati', sub: 'Skull-Shining Breath', tag: 'Wake up body and brain', cat: 'energy', level: 'Intermediate', minutes: 4,
      mode: 'pumps', pumps: 30, pumpSec: 1, rounds: 3, rest: 30, pumpLabel: 'Snap exhale',
      about: 'Short, forceful exhales driven by the belly, with passive inhales. A traditional cleansing practice that energises and warms.',
      steps: ['Sit tall on an empty stomach.', 'Exhale sharply through the nose by snapping the belly in.', 'Let the inhale happen passively as the belly releases.', 'After each round, breathe naturally and rest.'],
      benefits: ['Energises', 'Strengthens core', 'Clears the mind'],
      caution: 'Avoid if pregnant, or with high blood pressure, heart disease, hernia, epilepsy, or recent abdominal surgery. Stop if dizzy.'
    },
    {
      id: 'bhastrika', name: 'Bhastrika', sub: 'Bellows Breath', tag: 'Stoke the inner fire', cat: 'energy', level: 'Intermediate', minutes: 4,
      mode: 'bellows', pumps: 20, pumpSec: 1.2, rounds: 3, rest: 30,
      about: 'Equal, vigorous inhales and exhales through the nose, like a blacksmith’s bellows. Raises energy and alertness.',
      steps: ['Sit tall, hands on knees.', 'Inhale forcefully, expanding the chest.', 'Exhale forcefully, drawing the belly in.', 'Keep an even rhythm; rest between rounds.'],
      benefits: ['Raises alertness', 'Warms the body', 'Clears congestion'],
      caution: 'Not for pregnancy, high blood pressure, heart conditions, epilepsy or panic disorder. Stop if light-headed.'
    },
    {
      id: 'power', name: 'Power Breathing Rounds', tag: 'Breath work + retention', cat: 'energy', level: 'Advanced', minutes: 11,
      mode: 'power', breaths: 30, rounds: 3,
      about: '30 deep, rhythmic breaths, then exhale and hold empty for as long as is comfortable, then a recovery breath held for 15 seconds. Your retention times are recorded.',
      steps: ['Sit or lie down somewhere safe.', 'Take 30 full breaths: belly, chest, then let go.', 'After the last exhale, hold empty. Tap the button when you need to breathe.', 'Take a deep recovery breath and hold for 15 seconds.'],
      benefits: ['Energy and alertness', 'Builds CO₂ tolerance', 'Trains calm under discomfort'],
      caution: 'Never practise in or near water, while driving, or standing. Tingling and light-headedness are normal; stop if you feel unwell. Not for pregnancy, epilepsy, or heart conditions.'
    }
  ];

  const LABELS = { in: 'Breathe in', in2: 'Sip in', hold: 'Hold', out: 'Breathe out', holdOut: 'Hold empty', rest: 'Breathe naturally' };

  function phasesToSegs(phases, cycleIdx) {
    return phases.map(([k, d, label]) => ({ k, d, label: label || LABELS[k], cycle: cycleIdx }));
  }

  const restSeg = (d, sub) => ({ k: 'rest', d, label: 'Rest', sub: sub || 'Breathe naturally. The next round starts soon.', isRest: true });

  /** opts.rest: seconds of natural breathing between rounds (0 = continuous). */
  function buildBreath(b, minutes, opts = {}) {
    const segs = [{ k: 'rest', d: 5, label: 'Settle in', sub: 'Sit comfortably and soften your shoulders.' }];
    const rest = opts.rest != null ? +opts.rest : null;
    if (b.stages) {
      const total = b.stages.reduce((a, s) => a + s.minutes, 0);
      const scale = (minutes || total) / total;
      let c = 0;
      b.stages.forEach((st, si) => {
        if (si > 0 && rest) segs.push(restSeg(rest, 'Breathe naturally. The rhythm slows down next.'));
        const len = st.phases.reduce((a, p) => a + p[1], 0);
        const n = Math.max(1, Math.round((st.minutes * scale * 60) / len));
        for (let i = 0; i < n; i++) segs.push(...phasesToSegs(st.phases, ++c));
      });
      return segs;
    }
    if (b.mode === 'pumps' || b.mode === 'bellows') {
      if (rest != null) b = Object.assign({}, b, { rest: Math.max(10, rest) });
      const rounds = Math.max(1, Math.round(b.rounds * ((minutes || b.minutes) / b.minutes)));
      for (let r = 1; r <= rounds; r++) {
        segs.push({ k: 'in', d: 3, label: 'Deep breath in', sub: `Round ${r} of ${rounds}`, cycle: r });
        for (let i = 0; i < b.pumps; i++) {
          const half = b.pumpSec / 2;
          if (b.mode === 'pumps') {
            segs.push({ k: 'pumpOut', d: half, label: b.pumpLabel, quiet: true, cycle: r, pump: i + 1, of: b.pumps });
            segs.push({ k: 'pumpIn', d: half, label: 'Release', quiet: true, cycle: r, pump: i + 1, of: b.pumps });
          } else {
            segs.push({ k: 'pumpIn', d: half, label: 'In', quiet: true, cycle: r, pump: i + 1, of: b.pumps });
            segs.push({ k: 'pumpOut', d: half, label: 'Out', quiet: true, cycle: r, pump: i + 1, of: b.pumps });
          }
        }
        segs.push({ k: 'out', d: 4, label: 'Exhale fully', cycle: r });
        segs.push({ k: 'rest', d: b.rest, label: 'Rest', sub: r < rounds ? 'Breathe naturally. Notice the stillness and energy.' : 'Breathe naturally and enjoy the stillness.', cycle: r, isRest: true });
      }
      return segs;
    }
    if (b.mode === 'power') {
      const rounds = b.rounds;
      for (let r = 1; r <= rounds; r++) {
        for (let i = 0; i < b.breaths; i++) {
          segs.push({ k: 'in', d: 1.7, label: 'In', quiet: i > 0, cycle: r, pump: i + 1, of: b.breaths, sub: `Round ${r} · breath ${i + 1} of ${b.breaths}` });
          segs.push({ k: 'out', d: 1.5, label: 'Let go', quiet: true, cycle: r, pump: i + 1, of: b.breaths, sub: `Round ${r} · breath ${i + 1} of ${b.breaths}` });
        }
        segs.push({ k: 'free', label: 'Hold empty', scale: 0.42, rec: 'powerHold', sub: 'Exhale and hold. Relax everything. Tap when you need to breathe.', cycle: r });
        segs.push({ k: 'in', d: 2.5, label: 'Recovery breath', sub: 'Big breath in…', cycle: r });
        segs.push({ k: 'hold', d: 15, label: 'Hold', sub: 'Hold the recovery breath.', cycle: r });
        segs.push({ k: 'out', d: 3, label: 'Release', cycle: r });
        if (r < rounds) segs.push({ k: 'rest', d: rest != null ? Math.max(5, rest) : 15, label: 'Rest', sub: `Breathe normally. Round ${r + 1} starts soon.`, cycle: r, isRest: true });
      }
      return segs;
    }
    const len = b.phases.reduce((a, p) => a + p[1], 0);
    const cycles = Math.max(1, Math.round(((minutes || b.minutes) * 60) / len));
    // With rest enabled, split the session into ~2-minute rounds separated by natural breathing.
    const per = rest ? Math.max(1, Math.round(120 / len)) : cycles;
    for (let i = 1; i <= cycles; i++) {
      if (rest && i > 1 && (i - 1) % per === 0) segs.push(restSeg(rest));
      segs.push(...phasesToSegs(b.phases, i));
    }
    return segs;
  }
  /** Default rest between breathing rounds: continuous techniques flow without breaks unless asked. */
  const breathRestDefault = (b) => (b.mode === 'pumps' || b.mode === 'bellows') ? b.rest : b.mode === 'power' ? 15 : 0;
  const breathRestOptions = (b) => (b.mode === 'pumps' || b.mode === 'bellows') ? [15, 30, 45, 60] : b.mode === 'power' ? [10, 15, 30, 60] : [0, 15, 30, 60];

  // ===========================================================================
  // Breath challenges — tests and trainers with recorded results
  // ===========================================================================
  const boltBand = (s) => s < 10 ? 'Very low — lots of room to grow' : s < 20 ? 'Below average — keep training' : s < 30 ? 'Good' : s < 40 ? 'Very good' : 'Excellent';
  const holdBand = (s) => s < 30 ? 'Starting point' : s < 60 ? 'Average' : s < 90 ? 'Good' : s < 150 ? 'Very good' : 'Elite';

  const CHALLENGES = [
    {
      id: 'bolt', name: 'BOLT Score Test', sub: 'Body Oxygen Level Test', icon: 'stopwatch', minutes: 1, rec: 'bolt', unit: 's',
      tag: 'Measure your breathing efficiency',
      about: 'The BOLT score (from the Buteyko method) is how long you can comfortably hold your breath after a normal exhale, until the first definite urge to breathe. It reflects CO₂ tolerance and tends to rise as your everyday breathing improves. Test first thing in the morning for consistency.',
      steps: ['Sit and breathe normally through the nose for 15 seconds.', 'Take a normal breath in and a normal breath out.', 'Pinch your nose and start holding.', 'Tap as soon as you feel the FIRST definite urge to breathe — not your max.'],
      interpret: boltBand,
      build: () => [
        { k: 'rest', d: 15, label: 'Breathe normally', sub: 'Relaxed, through the nose.' },
        { k: 'in', d: 3, label: 'Normal breath in' },
        { k: 'out', d: 3, label: 'Normal breath out', sub: 'Do not empty fully.' },
        { k: 'free', label: 'Hold — pinch nose', scale: 0.5, rec: 'bolt', sub: 'Tap at the first clear urge to breathe.' },
        { k: 'rest', d: 10, label: 'Breathe calmly', sub: 'Your first breath should be calm. If you gasp, you held too long.' }
      ]
    },
    {
      id: 'maxhold', name: 'Max Breath Hold', sub: 'Static apnea test', icon: 'target', minutes: 3, rec: 'maxHold', unit: 's',
      tag: 'How long can you comfortably hold?',
      about: 'After a calm minute of breathing, take one full breath and hold as long as you comfortably can. Your result sets the difficulty of the CO₂ and O₂ tables.',
      steps: ['Sit or lie down. Never test in water or while driving.', 'Breathe calmly for one minute.', 'Take a full, deep breath and hold.', 'Relax every muscle. Tap when you need to breathe.'],
      interpret: holdBand,
      build: () => [
        { k: 'rest', d: 60, label: 'Breathe calmly', sub: 'Slow, relaxed breathing. Let your heart rate settle.' },
        { k: 'out', d: 4, label: 'Exhale fully' },
        { k: 'in', d: 4, label: 'Full breath in', sub: 'Belly, ribs, chest.' },
        { k: 'free', label: 'Hold', scale: 1, rec: 'maxHold', sub: 'Relax your face and shoulders. Tap when you need to breathe.' },
        { k: 'rest', d: 15, label: 'Recover', sub: 'A few calm recovery breaths.' }
      ]
    },
    {
      id: 'co2', name: 'CO₂ Tolerance Table', sub: 'Shrinking rests, fixed holds', icon: 'stairs', minutes: 16,
      tag: 'Train calm when the urge rises',
      about: 'Eight breath-holds at half your max, while the rest between them shrinks from 2:00 to 0:15. Builds tolerance to rising CO₂ — the main driver of the urge to breathe. Practise 2–3 times a week.',
      steps: ['Do the Max Breath Hold test first so the table fits you.', 'Breathe calmly during the rests.', 'Take a full breath and hold when prompted.', 'If a hold feels too hard, end the session — that is fine.'],
      build: () => {
        const max = Store.pb('maxHold') || 60, hold = Math.max(10, Math.round(max * 0.5));
        const segs = [];
        [120, 105, 90, 75, 60, 45, 30, 15].forEach((rest, i) => {
          segs.push({ k: 'rest', d: rest, label: 'Breathe', sub: `Round ${i + 1} of 8 · rest ${UI.fmt(rest)}`, cycle: i + 1 });
          segs.push({ k: 'in', d: 3, label: 'Full breath in', cycle: i + 1 });
          segs.push({ k: 'hold', d: hold, label: 'Hold', sub: `Round ${i + 1} · hold ${UI.fmt(hold)}`, cycle: i + 1, onEnd: { rec: 'co2Rounds', v: i + 1 } });
        });
        segs.push({ k: 'rest', d: 20, label: 'Recover', sub: 'Table complete. Breathe easy.' });
        return segs;
      },
      rec: 'co2Rounds', unit: ' rounds'
    },
    {
      id: 'o2', name: 'O₂ Table', sub: 'Growing holds, fixed rests', icon: 'stairs', minutes: 22,
      tag: 'Extend your breath-hold safely',
      about: 'Eight holds with a fixed 2:00 rest; each hold grows from 40% to 80% of your max. Trains your body to cope with lower oxygen. Do not do on the same day as a CO₂ table.',
      steps: ['Do the Max Breath Hold test first.', 'Breathe calmly during each 2-minute rest.', 'Hold when prompted; holds get longer each round.', 'Stop if you feel any discomfort beyond the normal urge.'],
      build: () => {
        const max = Store.pb('maxHold') || 60;
        const segs = [];
        for (let i = 0; i < 8; i++) {
          const hold = Math.max(10, Math.round(max * (0.4 + i * (0.4 / 7))));
          segs.push({ k: 'rest', d: 120, label: 'Breathe', sub: `Round ${i + 1} of 8 · rest 2:00`, cycle: i + 1 });
          segs.push({ k: 'in', d: 3, label: 'Full breath in', cycle: i + 1 });
          segs.push({ k: 'hold', d: hold, label: 'Hold', sub: `Round ${i + 1} · hold ${UI.fmt(hold)}`, cycle: i + 1, onEnd: { rec: 'o2Rounds', v: i + 1 } });
        }
        segs.push({ k: 'rest', d: 20, label: 'Recover', sub: 'Table complete.' });
        return segs;
      },
      rec: 'o2Rounds', unit: ' rounds'
    },
    {
      id: 'ladder', name: 'Box Breathing Ladder', sub: 'Climb from 4s to 10s', icon: 'stairs', minutes: 12, rec: 'boxLadder', unit: 's',
      tag: 'How long can your box get?',
      about: 'Three box-breathing cycles at each level, starting at 4-4-4-4 and climbing by one second per side. Stop when it stops feeling smooth — your highest comfortable level is recorded.',
      steps: ['Breathe through the nose throughout.', 'Each level adds one second to every side.', 'End the session when you can no longer stay relaxed.'],
      interpret: (v) => v < 6 ? 'Building' : v < 8 ? 'Solid control' : v < 10 ? 'Excellent control' : 'Mastery',
      build: () => {
        const segs = [{ k: 'rest', d: 5, label: 'Settle in' }];
        for (let n = 4; n <= 10; n++) {
          for (let c = 1; c <= 3; c++) {
            segs.push({ k: 'in', d: n, cycle: n, sub: `Level ${n}s · cycle ${c} of 3`, label: 'Breathe in' });
            segs.push({ k: 'hold', d: n, cycle: n, sub: `Level ${n}s · cycle ${c} of 3`, label: 'Hold' });
            segs.push({ k: 'out', d: n, cycle: n, sub: `Level ${n}s · cycle ${c} of 3`, label: 'Breathe out' });
            segs.push({ k: 'holdOut', d: n, cycle: n, sub: `Level ${n}s · cycle ${c} of 3`, label: 'Hold empty', onEnd: c === 3 ? { rec: 'boxLadder', v: n } : null });
          }
        }
        return segs;
      }
    },
    {
      id: 'exhale', name: 'Exhale Extension', sub: 'Lengthen the out-breath', icon: 'wind', minutes: 8, rec: 'exhaleMax', unit: 's',
      tag: 'Grow a long, smooth exhale',
      about: 'Inhale for 4 while the exhale grows from 6 to 20 seconds. A long, controlled exhale is a hallmark of a calm nervous system and strong breath control.',
      steps: ['Inhale through the nose for 4.', 'Exhale slowly — through pursed lips if it helps.', 'The exhale grows by 2 seconds every 2 breaths.', 'End when you can no longer keep it smooth.'],
      interpret: (v) => v < 10 ? 'Building' : v < 14 ? 'Good' : v < 18 ? 'Very good' : 'Excellent',
      build: () => {
        const segs = [{ k: 'rest', d: 5, label: 'Settle in' }];
        for (let e = 6; e <= 20; e += 2) {
          for (let c = 1; c <= 2; c++) {
            segs.push({ k: 'in', d: 4, label: 'Breathe in', sub: `Exhale ${e}s · breath ${c} of 2`, cycle: e });
            segs.push({ k: 'out', d: e, label: 'Slow exhale', sub: `Exhale ${e}s · breath ${c} of 2`, cycle: e, onEnd: c === 2 ? { rec: 'exhaleMax', v: e } : null });
          }
        }
        return segs;
      }
    },
    {
      id: 'retention', name: 'Retention Challenge', sub: '3 rounds of power breathing', icon: 'bolt', minutes: 11, rec: 'powerHold', unit: 's',
      tag: 'Best empty-lung hold after 30 breaths',
      about: 'Three rounds of Power Breathing. Your longest empty-lung retention is recorded — most people are surprised how long they can hold after the breathing phase.',
      steps: ['Sit or lie down somewhere safe.', '30 deep breaths per round.', 'Exhale and hold empty; tap when you need to breathe.', 'Recovery breath, hold 15 seconds, repeat.'],
      interpret: holdBand,
      caution: 'Never in or near water, while driving, or standing.',
      build: () => buildBreath(BREATHS.find((b) => b.id === 'power'))
    }
  ];

  // ===========================================================================
  // Exercises — animated demonstrations
  // frames: [poseName, holdSeconds, transitionSeconds]
  // ===========================================================================
  const EX = {
    jumping_jacks: { name: 'Jumping Jacks', frames: [['jjClosed', 0.05, 0.2], ['jjMid', 0, 0.14], ['jjOpen', 0.05, 0.2], ['jjMid', 0, 0.14]], muscles: 'Full body · cardio', level: 'Beginner',
      steps: ['Stand tall, feet together, arms by your sides.', 'Jump feet out wide while sweeping arms overhead.', 'Jump back to the start.', 'Land softly on the balls of your feet.'], tips: ['Keep a light bounce', 'Breathe rhythmically'] },
    high_knees: { name: 'High Knees', frames: [['hkA', 0.02, 0.22], ['hkB', 0.02, 0.22]], muscles: 'Hip flexors · core · cardio', level: 'Beginner',
      steps: ['Run on the spot.', 'Drive each knee up to hip height.', 'Pump the opposite arm.', 'Stay on the balls of your feet.'], tips: ['Tall chest', 'Quick, light feet'] },
    march: { name: 'Standing March', frames: [['marchA', 0.15, 0.45], ['marchB', 0.15, 0.45]], muscles: 'Hips · warm-up', level: 'Beginner',
      steps: ['Stand tall.', 'Lift one knee, then the other, at a steady pace.', 'Swing the arms naturally.'], tips: ['Low-impact alternative to high knees'] },
    squats: { name: 'Bodyweight Squats', frames: [['squatUp', 0.3, 1.0], ['squatDown', 0.25, 1.0]], anchor: 'ltoe', muscles: 'Quads · glutes · core', level: 'Beginner',
      steps: ['Feet shoulder-width apart, toes slightly out.', 'Push hips back and bend the knees as if sitting into a chair.', 'Lower until thighs are about parallel to the floor.', 'Drive through your heels to stand.'], tips: ['Keep heels down', 'Knees track over toes', 'Chest proud'] },
    squat_jumps: { name: 'Squat Jumps', frames: [['squatUp', 0.15, 0.5], ['squatDown', 0.1, 0.35], ['jumpUp', 0.05, 0.4]], anchor: 'ltoe', muscles: 'Legs · power · cardio', level: 'Intermediate',
      steps: ['Lower into a squat.', 'Explode upward, reaching arms overhead.', 'Land softly and sink straight into the next squat.'], tips: ['Soft knees on landing', 'Use the arms for momentum'] },
    reverse_lunges: { name: 'Reverse Lunges', frames: [['stand', 0.3, 0.9], ['lungeDown', 0.3, 0.9]], anchor: 'rtoe', muscles: 'Quads · glutes · balance', level: 'Beginner',
      steps: ['Stand tall, hands on hips or by your sides.', 'Step one foot back and lower the back knee toward the floor.', 'Front knee stays over the ankle.', 'Push through the front heel to return. Alternate legs.'], tips: ['Torso upright', 'Back knee hovers just above the floor'] },
    side_lunges: { name: 'Side Lunges', frames: [['standWide', 0.3, 0.8], ['sideLungeR', 0.35, 0.8], ['standWide', 0.3, 0.8], ['sideLungeL', 0.35, 0.8]], muscles: 'Inner thighs · glutes · quads', level: 'Beginner',
      steps: ['Stand with feet wide.', 'Shift your weight to one side, bending that knee and sitting the hips back.', 'Keep the other leg straight.', 'Push back to centre and switch sides.'], tips: ['Both feet stay flat', 'Chest up'] },
    pushups: { name: 'Push-ups', frames: [['plankHigh', 0.25, 0.9], ['pushDown', 0.15, 0.9]], anchor: 'ltoe', muscles: 'Chest · shoulders · triceps · core', level: 'Intermediate',
      steps: ['Start in a high plank, hands under shoulders.', 'Lower your chest toward the floor, elbows at about 45°.', 'Keep a straight line from head to heels.', 'Press back up.'], tips: ['Too hard? Drop to your knees', 'Squeeze glutes to protect the lower back'] },
    plank: { name: 'Forearm Plank', frames: [['plankLow', 2, 0]], muscles: 'Core · shoulders', level: 'Beginner',
      steps: ['Elbows under shoulders, forearms on the floor.', 'Step feet back; body forms a straight line.', 'Brace your abs and squeeze your glutes.', 'Breathe steadily and hold.'], tips: ['Don’t let hips sag or pike', 'Look at the floor just ahead of your hands'] },
    side_plank: { name: 'Side Plank', frames: [['sidePlank', 2, 0]], muscles: 'Obliques · shoulders', level: 'Intermediate',
      steps: ['Lie on your side, supporting hand under the shoulder.', 'Stack the feet and lift the hips.', 'Reach the top arm to the sky.', 'Hold, then switch sides halfway.'], tips: ['Easier: bend the bottom knee', 'Keep hips lifted'] },
    mountain_climbers: { name: 'Mountain Climbers', frames: [['mcR', 0.02, 0.28], ['mcL', 0.02, 0.28]], anchor: 'rhand', muscles: 'Core · shoulders · cardio', level: 'Intermediate',
      steps: ['Start in a high plank.', 'Drive one knee toward your chest.', 'Quickly switch legs, like running in place.'], tips: ['Hips level with shoulders', 'Hands stay planted'] },
    burpees: { name: 'Burpees', frames: [['stand', 0.15, 0.35], ['crouch', 0.05, 0.3], ['plankHigh', 0.15, 0.3], ['crouch', 0.05, 0.3], ['stand', 0, 0.3], ['jumpUp', 0.05, 0.35]], muscles: 'Full body · cardio', level: 'Advanced',
      steps: ['Squat down and place hands on the floor.', 'Jump or step the feet back to a plank.', 'Jump the feet back toward the hands.', 'Explode up with arms overhead.'], tips: ['Step instead of jump to lower the impact', 'Keep the core tight in the plank'] },
    crunches: { name: 'Crunches', frames: [['hook', 0.3, 0.7], ['crunchUp', 0.3, 0.7]], muscles: 'Abs', level: 'Beginner',
      steps: ['Lie on your back, knees bent, feet flat.', 'Exhale and curl your head and shoulders off the floor.', 'Reach toward your knees.', 'Lower slowly with control.'], tips: ['Don’t pull on your neck', 'Lower back stays down'] },
    leg_raises: { name: 'Leg Raises', frames: [['lieBack', 0.2, 1.2], ['legsUp', 0.2, 1.2]], muscles: 'Lower abs · hip flexors', level: 'Intermediate',
      steps: ['Lie flat, arms by your sides.', 'Keeping legs straight, lift them to vertical.', 'Lower slowly without letting heels touch.'], tips: ['Press the lower back into the floor', 'Bend the knees to make it easier'] },
    flutter_kicks: { name: 'Flutter Kicks', frames: [['flutterA', 0, 0.25], ['flutterB', 0, 0.25]], muscles: 'Lower abs', level: 'Intermediate',
      steps: ['Lie on your back, legs straight and lifted slightly.', 'Alternate small, quick up-and-down kicks.'], tips: ['Lower back stays glued to the floor'] },
    glute_bridge: { name: 'Glute Bridge', frames: [['hook', 0.3, 0.9], ['bridgeUp', 0.6, 0.9]], anchor: 'ltoe', muscles: 'Glutes · hamstrings · lower back', level: 'Beginner',
      steps: ['Lie on your back, knees bent, feet hip-width.', 'Press through your heels and lift your hips.', 'Squeeze the glutes at the top.', 'Lower slowly.'], tips: ['Don’t over-arch the lower back', 'Ribs down'] },
    superman: { name: 'Superman', frames: [['prone', 0.4, 0.8], ['superman', 1, 0.8]], muscles: 'Lower back · glutes · shoulders', level: 'Beginner',
      steps: ['Lie face down, arms extended overhead.', 'Lift arms, chest and legs off the floor together.', 'Hold briefly, then lower.'], tips: ['Look at the floor to keep the neck long'] },
    wall_sit: { name: 'Wall Sit', frames: [['wallSit', 2, 0]], prop: 'wall', muscles: 'Quads · glutes', level: 'Beginner',
      steps: ['Lean your back against a wall.', 'Slide down until knees are bent to about 90°.', 'Keep knees over ankles and hold.'], tips: ['Push your back flat into the wall', 'Breathe steadily'] },
    calf_raises: { name: 'Calf Raises', frames: [['calfDown', 0.2, 0.6], ['calfUp', 0.3, 0.6]], anchor: 'ltoe', muscles: 'Calves · ankles', level: 'Beginner',
      steps: ['Stand tall, feet hip-width.', 'Rise onto the balls of your feet.', 'Pause, then lower slowly.'], tips: ['Hold a wall for balance if needed'] },
    arm_circles: { name: 'Arm Circles', frames: [['ac0', 0, 0.35], ['ac90', 0, 0.35], ['ac180', 0, 0.35], ['ac270', 0, 0.35], ['ac360', 0, 0]], muscles: 'Shoulders · mobility', level: 'Beginner',
      steps: ['Stand tall with arms relaxed.', 'Swing the arms in big, smooth circles.', 'Reverse direction halfway.'], tips: ['Keep the movement relaxed and controlled'] },
    side_bends: { name: 'Standing Side Bends', frames: [['sideBendR', 0.6, 1.2], ['standF', 0.2, 1.2], ['sideBendL', 0.6, 1.2], ['standF', 0.2, 1.2]], muscles: 'Obliques · spine mobility', level: 'Beginner',
      steps: ['Stand with feet hip-width.', 'Reach one arm overhead and lean to the opposite side.', 'Return to centre and switch.'], tips: ['Bend sideways, not forward'] },
    hip_hinge: { name: 'Hip Hinge', frames: [['stand', 0.2, 1.0], ['hinge', 0.3, 1.0]], anchor: 'ltoe', muscles: 'Hamstrings · glutes · posture', level: 'Beginner',
      steps: ['Stand tall, knees soft.', 'Push the hips back, letting the torso tip forward with a flat back.', 'Stop when you feel the hamstrings stretch.', 'Drive the hips forward to stand.'], tips: ['Spine stays long', 'Movement comes from the hips'] },
    cat_cow: { name: 'Cat–Cow', frames: [['cow', 0.6, 1.5], ['cat', 0.6, 1.5]], anchor: 'rhand', muscles: 'Spine mobility', level: 'Beginner',
      steps: ['On hands and knees, wrists under shoulders.', 'Inhale: drop the belly, lift chest and gaze (cow).', 'Exhale: round the spine, tuck the chin (cat).'], tips: ['Move with your breath'] },
    bird_dog: { name: 'Bird Dog', frames: [['table', 0.3, 0.8], ['birdDog', 1, 0.8]], anchor: 'lhand', muscles: 'Core · back · balance', level: 'Beginner',
      steps: ['Start on hands and knees.', 'Extend one arm forward and the opposite leg back.', 'Hold for a breath, return, then switch sides.'], tips: ['Keep hips square to the floor'] },
    cobra_stretch: { name: 'Cobra Stretch', frames: [['prone', 0.5, 1.2], ['cobra', 1.5, 1.2]], muscles: 'Spine · chest · abs stretch', level: 'Beginner',
      steps: ['Lie face down, hands under shoulders.', 'Press gently to lift the chest.', 'Keep elbows soft and shoulders down.'], tips: ['Lift only as high as is comfortable'] },
    forward_fold: { name: 'Forward Fold', frames: [['stand', 0.3, 1.4], ['fold', 2, 1.4]], anchor: 'ltoe', muscles: 'Hamstrings · back stretch', level: 'Beginner',
      steps: ['Stand tall.', 'Hinge at the hips and fold forward.', 'Let your head and arms hang heavy; bend knees as needed.'], tips: ['Soft knees protect the lower back'] },
    child_pose: { name: 'Child’s Pose', frames: [['child', 2, 0]], muscles: 'Recovery · back stretch', level: 'Beginner',
      steps: ['Kneel and sit back toward your heels.', 'Fold forward, forehead to the floor, arms extended.', 'Breathe into your back.'], tips: ['Widen the knees for more room'] }
  };
  // Step captions, one per keyframe (shown while moving into / holding that frame).
  const STEP_LABELS = {
    jumping_jacks: ['Feet together', 'Jump', 'Arms & legs wide', 'Jump'],
    high_knees: ['Right knee up', 'Left knee up'],
    march: ['Lift the knee', 'Switch legs'],
    squats: ['Drive up through the heels', 'Sit back & down'],
    squat_jumps: ['Land softly', 'Load the squat', 'Explode up'],
    reverse_lunges: ['Push back to standing', 'Step back & lower'],
    side_lunges: ['Back to centre', 'Shift right', 'Back to centre', 'Shift left'],
    pushups: ['Press up', 'Lower the chest'],
    plank: ['Hold one straight line'],
    side_plank: ['Lift the hips'],
    mountain_climbers: ['Right knee in', 'Left knee in'],
    burpees: ['Stand', 'Hands to the floor', 'Jump back to plank', 'Jump feet in', 'Rise', 'Jump!'],
    crunches: ['Lower with control', 'Curl up — exhale'],
    leg_raises: ['Lower slowly', 'Lift the legs'],
    flutter_kicks: ['Kick', 'Kick'],
    glute_bridge: ['Lower slowly', 'Lift hips & squeeze'],
    superman: ['Relax', 'Lift arms, chest & legs'],
    wall_sit: ['Hold — thighs level'],
    calf_raises: ['Lower slowly', 'Rise onto the toes'],
    side_bends: ['Reach & bend right', 'Back to centre', 'Reach & bend left', 'Back to centre'],
    hip_hinge: ['Stand tall', 'Hinge with a flat back'],
    cat_cow: ['Cow — inhale', 'Cat — exhale'],
    bird_dog: ['Tabletop', 'Reach & extend'],
    cobra_stretch: ['Lie down', 'Lift the chest'],
    forward_fold: ['Stand tall', 'Fold forward'],
    child_pose: ['Rest & breathe']
  };
  /** Body segments to highlight, derived from the "muscles worked" text. */
  function highlightFor(m) {
    m = m.toLowerCase();
    const s = new Set();
    if (/full body/.test(m)) ['thigh', 'shin', 'torso', 'hips', 'uarm', 'farm', 'shoulders'].forEach((x) => s.add(x));
    if (/quad|hamstring|thigh|\blegs?\b|hip flexor/.test(m)) s.add('thigh');
    if (/glute|\bhips\b/.test(m)) { s.add('hips'); s.add('thigh'); }
    if (/calf|calves|ankle/.test(m)) s.add('shin');
    if (/core|abs|oblique|back|spine/.test(m)) s.add('torso');
    if (/chest|shoulder/.test(m)) { s.add('shoulders'); s.add('uarm'); }
    if (/tricep|\barms?\b/.test(m)) { s.add('uarm'); s.add('farm'); }
    return [...s];
  }
  for (const id in EX) {
    const e = EX[id];
    e.id = id;
    e.hl = highlightFor(e.muscles);
    const labels = STEP_LABELS[id];
    if (labels) e.frames = e.frames.map((f, i) => [f[0], f[1], f[2], labels[i] || null]);
  }

  // ===========================================================================
  // Workouts
  // ===========================================================================
  const WORKOUTS = [
    { id: 'seven', name: '7-Minute Full Body', tag: 'The science-backed classic, no equipment', level: 'All levels', icon: 'bolt', work: 30, rest: 20, rounds: 1,
      items: ['jumping_jacks', 'wall_sit', 'pushups', 'crunches', 'high_knees', 'squats', 'superman', 'plank', 'march', 'reverse_lunges', 'mountain_climbers', 'side_plank'] },
    { id: 'morning', name: 'Morning Energizer', tag: 'Gentle wake-up for body and joints', level: 'Beginner', icon: 'sun', work: 40, rest: 15, rounds: 1,
      items: ['arm_circles', 'march', 'side_bends', 'squats', 'cat_cow', 'calf_raises', 'hip_hinge', 'cobra_stretch'] },
    { id: 'core', name: 'Core Builder', tag: 'Abs, obliques and lower back', level: 'Intermediate', icon: 'target', work: 40, rest: 20, rounds: 1,
      items: ['crunches', 'leg_raises', 'plank', 'flutter_kicks', 'side_plank', 'mountain_climbers', 'bird_dog', 'glute_bridge'] },
    { id: 'lower', name: 'Lower Body Burn', tag: 'Legs and glutes, two rounds', level: 'Intermediate', icon: 'stairs', work: 40, rest: 15, rounds: 2, roundRest: 45,
      items: ['squats', 'reverse_lunges', 'glute_bridge', 'side_lunges', 'wall_sit', 'calf_raises'] },
    { id: 'hiit', name: 'HIIT Blast', tag: 'Short, sweaty, heart-pumping', level: 'Advanced', icon: 'flame', work: 40, rest: 20, rounds: 2, roundRest: 60,
      items: ['burpees', 'mountain_climbers', 'squat_jumps', 'high_knees', 'pushups', 'jumping_jacks'] },
    { id: 'desk', name: 'Desk Break', tag: 'Undo sitting in 4 minutes', level: 'Beginner', icon: 'leaf', work: 30, rest: 8, rounds: 1,
      items: ['arm_circles', 'side_bends', 'march', 'hip_hinge', 'calf_raises', 'forward_fold'] },
    { id: 'recovery', name: 'Recovery Stretch', tag: 'Mobility for rest days', level: 'Beginner', icon: 'heart', work: 45, rest: 8, rounds: 1,
      items: ['cat_cow', 'child_pose', 'cobra_stretch', 'bird_dog', 'glute_bridge', 'forward_fold'] }
  ];
  function workoutSeconds(w) {
    const n = w.items.length;
    return w.rounds * (n * w.work + (n - 1) * w.rest) + (w.rounds - 1) * (w.roundRest || 30) + 10;
  }

  // ===========================================================================
  // Yoga asanas
  // ===========================================================================
  const YOGA = [
    { id: 'tadasana', pose: 'standF', name: 'Mountain Pose', sk: 'Tadasana', cat: 'Standing', level: 'Beginner', hold: 30,
      benefits: ['Improves posture', 'Grounds and centres', 'Foundation of all standing poses'],
      steps: ['Stand with feet together or hip-width, weight even.', 'Lengthen through the crown of the head.', 'Relax shoulders down, arms by your sides, palms forward.', 'Breathe slowly and feel rooted.'],
      cue: 'Root down through the feet, lift through the crown.' },
    { id: 'pranamasana', pose: 'pranam', name: 'Prayer Pose', sk: 'Pranamasana', cat: 'Standing', level: 'Beginner', hold: 20,
      benefits: ['Calms the mind', 'Opening of Sun Salutation'], steps: ['Stand tall.', 'Bring palms together at the centre of the chest.', 'Soften the gaze and breathe.'], cue: 'Palms together at the heart. Breathe.' },
    { id: 'urdhva_hastasana', pose: 'upSalute', name: 'Upward Salute', sk: 'Urdhva Hastasana', cat: 'Standing', level: 'Beginner', hold: 20,
      benefits: ['Stretches the side body', 'Opens the chest'], steps: ['From Mountain, sweep the arms overhead.', 'Lift the chest and gently arch the upper back.', 'Keep the lower back long.'], cue: 'Reach up and lift the heart.' },
    { id: 'uttanasana', pose: 'fold', name: 'Standing Forward Fold', sk: 'Uttanasana', cat: 'Forward fold', level: 'Beginner', hold: 30,
      benefits: ['Stretches hamstrings and back', 'Calms the nervous system'], steps: ['Hinge at the hips and fold forward.', 'Bend the knees as much as needed.', 'Let the head hang; hands to floor, shins or blocks.'], cue: 'Let the head hang heavy. Soften the knees.', caution: 'Bend the knees generously if you have lower-back issues.' },
    { id: 'ardha_uttanasana', pose: 'halfLift', name: 'Half Forward Fold', sk: 'Ardha Uttanasana', cat: 'Forward fold', level: 'Beginner', hold: 15,
      benefits: ['Lengthens the spine', 'Strengthens the back'], steps: ['From a forward fold, bring hands to the shins.', 'Lift the torso to a flat back, parallel to the floor.', 'Gaze slightly ahead.'], cue: 'Long, flat spine. Crown reaches forward.' },
    { id: 'ashwa_sanchalanasana', pose: 'lowLungeR', name: 'Equestrian Pose', sk: 'Ashwa Sanchalanasana', cat: 'Lunge', level: 'Beginner', hold: 30, sides: true,
      benefits: ['Opens hip flexors', 'Strengthens legs'], steps: ['From a fold, step one leg far back and lower that knee.', 'Front knee over the ankle, hands beside the front foot.', 'Lift the chest and look forward.'], cue: 'Sink the hips, lift the chest.' },
    { id: 'anjaneyasana', pose: 'crescent', name: 'Crescent Low Lunge', sk: 'Anjaneyasana', cat: 'Lunge', level: 'Intermediate', hold: 30, sides: true,
      benefits: ['Deep hip-flexor stretch', 'Opens the chest', 'Improves balance'], steps: ['From a low lunge, lift the torso upright.', 'Sweep the arms overhead.', 'Sink the hips forward and lift through the chest.'], cue: 'Hips sink, arms reach, heart lifts.', caution: 'Pad the back knee if it is sensitive.' },
    { id: 'phalakasana', pose: 'plank', name: 'Plank Pose', sk: 'Phalakasana', cat: 'Arm balance', level: 'Beginner', hold: 30,
      benefits: ['Builds core strength', 'Strengthens arms and wrists'], steps: ['Hands under shoulders, legs extended back.', 'One straight line from head to heels.', 'Press the floor away; engage the core.'], cue: 'Strong line from crown to heels.' },
    { id: 'ashtanga_namaskara', pose: 'ashtanga', name: 'Knees-Chest-Chin', sk: 'Ashtanga Namaskara', cat: 'Prone', level: 'Beginner', hold: 10,
      benefits: ['Prepares for backbends', 'Builds arm strength'], steps: ['From plank, lower knees to the floor.', 'Lower chest and chin between the hands, hips lifted.', 'Elbows hug the ribs.'], cue: 'Knees, chest and chin down; hips up.' },
    { id: 'bhujangasana', pose: 'cobra', name: 'Cobra Pose', sk: 'Bhujangasana', cat: 'Backbend', level: 'Beginner', hold: 20,
      benefits: ['Strengthens the spine', 'Opens chest and shoulders', 'Energising'], steps: ['Lie face down, hands under the shoulders.', 'Press the tops of the feet down.', 'Inhale and lift the chest, elbows soft and close.'], cue: 'Lift from the chest, shoulders away from ears.', caution: 'Avoid with recent back injury or during pregnancy.' },
    { id: 'adho_mukha_svanasana', pose: 'downDog', name: 'Downward-Facing Dog', sk: 'Adho Mukha Svanasana', cat: 'Inversion', level: 'Beginner', hold: 30,
      benefits: ['Stretches hamstrings, calves and shoulders', 'Strengthens arms', 'Energises the body'], steps: ['From hands and knees, tuck the toes and lift the hips.', 'Press the chest toward the thighs.', 'Heels reach toward the floor; bend knees if needed.'], cue: 'Hips high, heels heavy, long spine.', caution: 'Avoid with uncontrolled high blood pressure or late pregnancy.' },
    { id: 'balasana', pose: 'child', name: 'Child’s Pose', sk: 'Balasana', cat: 'Restorative', level: 'Beginner', hold: 60,
      benefits: ['Releases the back', 'Calms the mind', 'Gentle hip stretch'], steps: ['Kneel and sit back toward the heels.', 'Fold forward, forehead to the floor.', 'Arms extended forward or alongside the body.'], cue: 'Breathe into the back of the body.' },
    { id: 'vajrasana', pose: 'vajrasana', name: 'Thunderbolt Pose', sk: 'Vajrasana', cat: 'Seated', level: 'Beginner', hold: 60,
      benefits: ['Aids digestion', 'Good meditation seat', 'Stretches ankles'], steps: ['Kneel with knees together.', 'Sit back on the heels.', 'Spine tall, hands resting on the thighs.'], cue: 'Sit tall and steady on the heels.', caution: 'Place a cushion between heels and hips if knees are sensitive.' },
    { id: 'marjaryasana', pose: 'cat', name: 'Cat–Cow', sk: 'Marjaryasana–Bitilasana', cat: 'Spine', level: 'Beginner', hold: 40, flowFrames: [['cow', 0.6, 1.6], ['cat', 0.6, 1.6]],
      benefits: ['Mobilises the spine', 'Coordinates breath and movement'], steps: ['On hands and knees.', 'Inhale: belly drops, chest lifts (cow).', 'Exhale: spine rounds, chin tucks (cat).'], cue: 'Inhale to cow, exhale to cat.' },
    { id: 'setu_bandhasana', pose: 'bridge', name: 'Bridge Pose', sk: 'Setu Bandhasana', cat: 'Backbend', level: 'Beginner', hold: 30,
      benefits: ['Opens chest and hips', 'Strengthens glutes and back', 'Calms the brain'], steps: ['Lie on your back, knees bent, feet hip-width.', 'Press through feet and lift the hips.', 'Roll the shoulders under; arms on the floor.'], cue: 'Lift the hips, broaden the chest.', caution: 'Keep the neck still; don’t turn the head.' },
    { id: 'dandasana', pose: 'staff', name: 'Staff Pose', sk: 'Dandasana', cat: 'Seated', level: 'Beginner', hold: 30,
      benefits: ['Improves posture', 'Strengthens back muscles'], steps: ['Sit with legs extended forward.', 'Flex the feet, press thighs down.', 'Hands beside hips; lift the spine tall.'], cue: 'Tall spine, active legs.' },
    { id: 'paschimottanasana', pose: 'seatedFold', name: 'Seated Forward Bend', sk: 'Paschimottanasana', cat: 'Forward fold', level: 'Beginner', hold: 45,
      benefits: ['Stretches the whole back body', 'Calms the mind', 'Aids digestion'], steps: ['From Staff Pose, inhale and lengthen.', 'Exhale and hinge forward from the hips.', 'Hold shins, ankles or feet; keep the spine long.'], cue: 'Lead with the chest, not the head.', caution: 'Bend the knees if the hamstrings are tight.' },
    { id: 'navasana', pose: 'boat', name: 'Boat Pose', sk: 'Navasana', cat: 'Core', level: 'Intermediate', hold: 20,
      benefits: ['Strengthens core and hip flexors', 'Improves balance'], steps: ['Sit, knees bent, and lean back slightly.', 'Lift the legs; straighten them if you can.', 'Arms reach forward, parallel to the floor.'], cue: 'Lift the chest, balance on the sit bones.', caution: 'Keep knees bent if your lower back strains.' },
    { id: 'dhanurasana', pose: 'bow', name: 'Bow Pose', sk: 'Dhanurasana', cat: 'Backbend', level: 'Intermediate', hold: 20,
      benefits: ['Opens chest and front body', 'Strengthens the back'], steps: ['Lie face down and bend the knees.', 'Reach back and hold the ankles.', 'Kick feet into hands to lift chest and thighs.'], cue: 'Kick into the hands, lift the heart.', caution: 'Avoid with back or neck injury, or during pregnancy.' },
    { id: 'sukhasana', pose: 'sukhasana', name: 'Easy Pose', sk: 'Sukhasana', cat: 'Seated', level: 'Beginner', hold: 60,
      benefits: ['Calms the mind', 'Opens the hips', 'Classic meditation seat'], steps: ['Sit cross-legged.', 'Lengthen the spine; relax the shoulders.', 'Rest hands on the knees.'], cue: 'Tall spine, soft shoulders, easy breath.' },
    { id: 'vrikshasana', pose: 'tree', name: 'Tree Pose', sk: 'Vrikshasana', cat: 'Balance', level: 'Beginner', hold: 30, sides: true,
      benefits: ['Improves balance and focus', 'Strengthens ankles and legs'], steps: ['Stand on one leg.', 'Place the other foot on the inner calf or thigh (not the knee).', 'Bring palms together overhead or at the heart.'], cue: 'Fix your gaze on one point. Grow tall.' },
    { id: 'virabhadrasana_1', pose: 'warrior1', name: 'Warrior I', sk: 'Virabhadrasana I', cat: 'Standing', level: 'Beginner', hold: 30, sides: true,
      benefits: ['Strengthens legs', 'Opens hips and chest', 'Builds stamina'], steps: ['Step one foot back, back foot angled out.', 'Bend the front knee over the ankle.', 'Square the hips forward; reach arms overhead.'], cue: 'Front knee over ankle, arms reach high.' },
    { id: 'virabhadrasana_2', pose: 'warrior2', name: 'Warrior II', sk: 'Virabhadrasana II', cat: 'Standing', level: 'Beginner', hold: 30, sides: true,
      benefits: ['Strengthens legs and shoulders', 'Opens hips', 'Builds focus'], steps: ['Stand with feet wide.', 'Turn the front foot out and bend that knee.', 'Extend arms to the sides; gaze over the front hand.'], cue: 'Strong legs, arms long, gaze steady.' },
    { id: 'trikonasana', pose: 'triangle', name: 'Triangle Pose', sk: 'Utthita Trikonasana', cat: 'Standing', level: 'Beginner', hold: 30, sides: true,
      benefits: ['Stretches legs and side body', 'Opens chest', 'Improves balance'], steps: ['Stand with feet wide, front foot turned out.', 'Reach forward over the front leg, then tip the torso down.', 'Lower hand to shin; top arm reaches up.'], cue: 'Long side body. Stack the shoulders.' },
    { id: 'utkatasana', pose: 'chair', name: 'Chair Pose', sk: 'Utkatasana', cat: 'Standing', level: 'Beginner', hold: 30,
      benefits: ['Strengthens thighs and glutes', 'Builds heat and stamina'], steps: ['From Mountain, bend the knees and sit the hips back.', 'Reach arms overhead alongside the ears.', 'Weight in the heels; chest lifted.'], cue: 'Sit back into your heels, reach up.' },
    { id: 'natarajasana', pose: 'dancer', name: 'Dancer’s Pose', sk: 'Natarajasana', cat: 'Balance', level: 'Intermediate', hold: 20, sides: true,
      benefits: ['Improves balance', 'Opens shoulders and hip flexors'], steps: ['Stand on one leg.', 'Bend the other knee and hold the inside of that foot.', 'Kick the foot into the hand and tip forward, reaching the other arm ahead.'], cue: 'Kick back, reach forward, find balance.' },
    { id: 'sarvangasana', pose: 'shoulderStand', name: 'Shoulder Stand', sk: 'Salamba Sarvangasana', cat: 'Inversion', level: 'Advanced', hold: 30,
      benefits: ['Calming inversion', 'Strengthens shoulders and core'], steps: ['Lie on your back and lift the legs and hips.', 'Support the back with your hands, elbows on the floor.', 'Extend the legs straight up.'], cue: 'Weight on the shoulders, not the neck.', caution: 'Avoid with neck problems, high blood pressure, glaucoma, or during menstruation/pregnancy. Learn with a teacher first.' },
    { id: 'shavasana', pose: 'savasana', name: 'Corpse Pose', sk: 'Shavasana', cat: 'Restorative', level: 'Beginner', hold: 180,
      benefits: ['Deep relaxation', 'Integrates the practice', 'Reduces stress'], steps: ['Lie flat on your back.', 'Let the feet fall open, arms slightly away from the body.', 'Close your eyes and release all effort.'], cue: 'Let go completely. Let the floor hold you.' }
  ];
  const yogaById = (id) => YOGA.find((y) => y.id === id);

  // ===========================================================================
  // Yoga flows
  // ===========================================================================
  // Surya Namaskar (Hatha, 12 steps); each round = right side + left side
  function suryaSteps(side) {
    const back = side === 'R' ? 'lowLungeR' : 'lowLungeL', fwd = side === 'R' ? 'lowLungeL' : 'lowLungeR';
    const sideTxt = side === 'R' ? 'right' : 'left';
    const frontToe = (pose) => (pose === 'lowLungeR' ? 'lto' : 'rto');
    return [
      { pose: 'pranam', name: 'Prayer Pose', sk: 'Pranamasana', breath: 'Exhale', cue: 'Palms together at the heart.', anchor: 'lto' },
      { pose: 'upSalute', name: 'Raised Arms', sk: 'Hasta Uttanasana', breath: 'Inhale', cue: 'Sweep the arms up and lift the chest.', anchor: 'lto' },
      { pose: 'fold', name: 'Hand to Foot', sk: 'Hasta Padasana', breath: 'Exhale', cue: 'Fold forward, hands to the floor.', anchor: 'lto' },
      { pose: back, name: 'Equestrian', sk: 'Ashwa Sanchalanasana', breath: 'Inhale', cue: `Step the ${sideTxt} leg back, look forward.`, anchor: frontToe(back) },
      { pose: 'plank', name: 'Stick Pose', sk: 'Dandasana', breath: 'Hold', cue: 'Step back to plank. Strong straight line.', anchor: 'rha' },
      { pose: 'ashtanga', name: 'Eight Limbs', sk: 'Ashtanga Namaskara', breath: 'Exhale', cue: 'Knees, chest and chin to the floor.', anchor: 'rha' },
      { pose: 'cobra', name: 'Cobra', sk: 'Bhujangasana', breath: 'Inhale', cue: 'Slide forward and lift the chest.', anchor: 'rha' },
      { pose: 'downDog', name: 'Mountain (Down Dog)', sk: 'Parvatasana', breath: 'Exhale', cue: 'Lift the hips high.', anchor: 'rha' },
      { pose: fwd, name: 'Equestrian', sk: 'Ashwa Sanchalanasana', breath: 'Inhale', cue: `Step the ${sideTxt} foot forward between the hands.`, anchor: 'rha' },
      { pose: 'fold', name: 'Hand to Foot', sk: 'Hasta Padasana', breath: 'Exhale', cue: 'Bring the back foot forward and fold.', anchor: frontToe(fwd) },
      { pose: 'upSalute', name: 'Raised Arms', sk: 'Hasta Uttanasana', breath: 'Inhale', cue: 'Rise up with a long spine, arms overhead.', anchor: 'lto' },
      { pose: 'stand', name: 'Mountain', sk: 'Tadasana', breath: 'Exhale', cue: 'Arms down. Feel the energy.', anchor: 'lto' }
    ];
  }

  const FLOWS = [
    { id: 'surya', name: 'Surya Namaskar', sub: 'Sun Salutation', tag: '12 postures linked with breath', level: 'All levels', type: 'surya', rounds: 3, pace: 5, icon: 'sun',
      about: 'The classic 12-step Hatha Sun Salutation. Each posture is held for about one breath; a full round includes the right and left sides. Start with 3 rounds and build toward 12.' },
    { id: 'morning', name: 'Morning Flow', tag: 'Wake up the whole body', level: 'Beginner', icon: 'sun',
      items: [['tadasana', 30], ['urdhva_hastasana', 20], ['uttanasana', 30], ['ardha_uttanasana', 15], ['adho_mukha_svanasana', 40], ['marjaryasana', 40], ['bhujangasana', 20], ['adho_mukha_svanasana', 30], ['virabhadrasana_1', 30], ['virabhadrasana_2', 30], ['trikonasana', 30], ['vrikshasana', 30], ['tadasana', 20]] },
    { id: 'unwind', name: 'Bedtime Unwind', tag: 'Slow, grounding poses before sleep', level: 'Beginner', icon: 'moon',
      items: [['balasana', 60], ['marjaryasana', 45], ['paschimottanasana', 60], ['setu_bandhasana', 30], ['balasana', 45], ['shavasana', 180]] },
    { id: 'backcare', name: 'Back & Hip Relief', tag: 'For long days at a desk', level: 'Beginner', icon: 'leaf',
      items: [['marjaryasana', 45], ['balasana', 45], ['bhujangasana', 20], ['adho_mukha_svanasana', 30], ['ashwa_sanchalanasana', 30], ['setu_bandhasana', 30], ['paschimottanasana', 45], ['shavasana', 90]] },
    { id: 'balance', name: 'Balance & Strength', tag: 'Steady legs, strong core, calm focus', level: 'Intermediate', icon: 'target',
      items: [['tadasana', 20], ['utkatasana', 30], ['virabhadrasana_1', 30], ['virabhadrasana_2', 30], ['trikonasana', 30], ['vrikshasana', 30], ['natarajasana', 20], ['phalakasana', 30], ['navasana', 20], ['balasana', 40]] },
    { id: 'backbends', name: 'Heart Opener', tag: 'Gentle backbends for posture and energy', level: 'Intermediate', icon: 'heart',
      items: [['marjaryasana', 40], ['bhujangasana', 20], ['balasana', 30], ['anjaneyasana', 30], ['dhanurasana', 20], ['balasana', 30], ['setu_bandhasana', 30], ['shavasana', 90]] }
  ];
  /** o: {rounds, pace, roundRest, pause} */
  function flowSeconds(f, o = {}) {
    if (typeof o === 'number') o = { rounds: o };
    if (f.type === 'surya') {
      const rounds = o.rounds || f.rounds, pace = o.pace || f.pace;
      return rounds * 24 * pace + (rounds - 1) * (o.roundRest != null ? o.roundRest : 15) + 8;
    }
    const pause = o.pause != null ? o.pause : 5;
    let holds = 0, n = 0;
    for (const [id, s] of f.items) { const k = (yogaById(id) || {}).sides ? 2 : 1; holds += s * k; n += k; }
    return holds + (n - 1) * pause + 8;
  }

  // ===========================================================================
  // Multi-day programs (consistency challenges)
  // ===========================================================================
  const MED_ROTATION = ['breath-awareness', 'body-scan', 'stress-sos', 'loving-kindness', 'morning-intention', 'sleep-wind-down'];
  const PROGRAMS = [
    { id: 'calm21', name: '21-Day Calm Breath', tag: 'Build a daily breathing habit', days: 21, cat: 'breathe', icon: 'wind',
      about: 'A short breathing session every day, rotating through the most effective techniques. Sessions lengthen from 3 to 7 minutes over three weeks.',
      day: (d) => { const ids = ['coherent', 'box', 'extended', 'sigh', 'nadi', 'bhramari', '478']; const id = ids[(d - 1) % ids.length]; return { kind: 'breath', id, minutes: 3 + Math.floor((d - 1) / 7) * 2 }; } },
    { id: 'plank30', name: '30-Day Plank Challenge', tag: '20 seconds to 5 minutes', days: 30, cat: 'move', icon: 'target',
      about: 'Hold a forearm plank every day, building from 20 seconds to 5 minutes. Rest days are a gentle recovery stretch.',
      day: (d) => { const s = [20, 20, 30, 30, 40, 0, 45, 45, 60, 60, 60, 0, 90, 90, 90, 90, 0, 120, 120, 150, 150, 0, 180, 180, 180, 0, 210, 210, 240, 300][d - 1]; return s ? { kind: 'exercise', id: 'plank', seconds: s } : { kind: 'workout', id: 'recovery' }; },
      label: (d, desc) => desc.kind === 'exercise' ? `Plank ${UI.fmt(desc.seconds)}` : 'Rest day · stretch' },
    { id: 'squat30', name: '30-Day Squat Challenge', tag: 'Stronger legs, three sets a day', days: 30, cat: 'move', icon: 'stairs',
      about: 'Three timed sets every day. Work time grows from 30 to 60 seconds, with lunges and wall sits mixed in to keep it fresh.',
      day: (d) => { const work = Math.min(60, 30 + Math.floor((d - 1) / 3) * 3); const alt = d % 3 === 0 ? 'reverse_lunges' : d % 3 === 2 ? 'wall_sit' : 'squat_jumps'; const items = d < 8 ? ['squats', 'squats', 'squats'] : ['squats', alt, 'squats']; return { kind: 'workout', custom: { name: `Squat Day ${d}`, items, work, rest: 30, rounds: 1 } }; },
      label: (d, desc) => `3 × ${desc.custom.work}s` },
    { id: 'med14', name: '14-Day Meditation Starter', tag: 'Two weeks to a calmer mind', days: 14, cat: 'mind', icon: 'moon',
      about: 'A guided meditation each day, then two days of quiet sitting with bells to practise on your own.',
      day: (d) => (d === 7 ? { kind: 'timer', minutes: 6 } : d === 14 ? { kind: 'timer', minutes: 10 } : { kind: 'meditation', id: MED_ROTATION[(d - 1) % MED_ROTATION.length] }) },
    { id: 'surya21', name: '21-Day Sun Salutation', tag: 'From 2 to 12 rounds', days: 21, cat: 'yoga', icon: 'sun',
      about: 'Practise Surya Namaskar daily, adding rounds as you get stronger. By day 21 you will flow through 12 full rounds.',
      day: (d) => ({ kind: 'flow', id: 'surya', rounds: Math.min(12, 2 + Math.floor((d - 1) / 2)) }),
      label: (d, desc) => `${desc.rounds} rounds` },
    { id: 'hold28', name: '28-Day Breath-Hold Builder', tag: 'Tests, tables and power breathing', days: 28, cat: 'challenge', icon: 'stopwatch',
      about: 'A structured four-week plan: weekly tests to track progress, CO₂ and O₂ tables to train, and easy breathing days to recover. Your test scores are graphed in Progress.',
      day: (d) => { const w = (d - 1) % 7; return [{ kind: 'challenge', id: 'maxhold' }, { kind: 'challenge', id: 'co2' }, { kind: 'breath', id: 'coherent', minutes: 5 }, { kind: 'challenge', id: 'o2' }, { kind: 'challenge', id: 'co2' }, { kind: 'challenge', id: 'retention' }, { kind: 'challenge', id: 'bolt' }][w]; } }
  ];

  // ===========================================================================
  // Today's plan (rotates through the week)
  // ===========================================================================
  function todayPlan(date) {
    const d = date || new Date();
    const doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
    const breathIds = ['box', 'coherent', 'sigh', 'nadi', 'extended', 'ujjayi', 'bhramari'];
    const moves = [
      { kind: 'flow', id: 'unwind' }, { kind: 'workout', id: 'seven' }, { kind: 'flow', id: 'morning' }, { kind: 'workout', id: 'core' },
      { kind: 'flow', id: 'balance' }, { kind: 'workout', id: 'hiit' }, { kind: 'flow', id: 'surya', rounds: 4 }
    ];
    return [
      { slot: 'Breathe', desc: { kind: 'breath', id: breathIds[doy % breathIds.length], minutes: 3 } },
      { slot: 'Move', desc: moves[d.getDay()] },
      { slot: 'Meditate', desc: { kind: 'meditation', id: MED_ROTATION[doy % MED_ROTATION.length] } }
    ];
  }

  window.Content = {
    BREATHS, CHALLENGES, EX, WORKOUTS, YOGA, FLOWS, PROGRAMS,
    breath: (id) => BREATHS.find((b) => b.id === id),
    challenge: (id) => CHALLENGES.find((c) => c.id === id),
    workout: (id) => WORKOUTS.find((w) => w.id === id),
    flow: (id) => FLOWS.find((f) => f.id === id),
    program: (id) => PROGRAMS.find((p) => p.id === id),
    yoga: yogaById,
    buildBreath, breathRestDefault, breathRestOptions, workoutSeconds, flowSeconds, suryaSteps, todayPlan
  };
})();
