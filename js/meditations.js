/* Prana — guided meditation scripts. Each line: [secondsFromStart, text]. */
(function () {
  'use strict';
  const MEDITATIONS = [
    {
      id: 'breath-awareness', name: 'Breath Awareness', tag: 'The foundation of all meditation', minutes: 5, ambient: 'drone', icon: 'wind',
      about: 'Rest your attention on the natural breath. When the mind wanders — and it will — gently return. That return is the practice.',
      script: [
        [2, 'Welcome. Find a comfortable seat, with your back upright but not stiff.'],
        [12, 'Let your hands rest. Close your eyes, or soften your gaze toward the floor.'],
        [22, 'Take a slow breath in through the nose… and let it go through the mouth.'],
        [32, 'Once more. Breathe in… and release.'],
        [44, 'Now let the breath return to its natural rhythm. No need to control it.'],
        [60, 'Notice where you feel the breath most clearly. The nostrils, the chest, or the belly.'],
        [80, 'Rest your attention there. Feel each breath arrive… and leave.'],
        [110, 'If thoughts appear, that is completely normal. Simply notice “thinking”, and come back to the breath.'],
        [145, 'You might silently count each exhale, from one to ten, then begin again.'],
        [185, 'Each time you return to the breath, you are strengthening your attention.'],
        [220, 'Notice the small pause at the end of each exhale. A moment of stillness.'],
        [255, 'Let the breath breathe itself. You are simply watching.'],
        [280, 'Slowly begin to widen your awareness. Notice sounds around you, and the feeling of your body.'],
        [292, 'When you are ready, gently open your eyes.']
      ]
    },
    {
      id: 'body-scan', name: 'Body Scan', tag: 'Release tension from head to toe', minutes: 10, ambient: 'drone', icon: 'leaf',
      about: 'Move a gentle, curious attention through the body, softening tension as you go. Wonderful lying down, or before sleep.',
      script: [
        [2, 'Welcome to this body scan. Lie down or sit comfortably, and let your eyes close.'],
        [14, 'Take three slow breaths, letting each exhale be a little longer than the inhale.'],
        [40, 'Feel the weight of your body supported by the floor, chair or bed. Let it hold you.'],
        [60, 'Bring your attention to the top of your head. Notice any sensations there — tingling, warmth, or nothing at all.'],
        [85, 'Move to your forehead. Let it soften and smooth.'],
        [105, 'Relax the muscles around your eyes. Let your eyes rest heavy.'],
        [125, 'Soften your jaw. Let the teeth part slightly, the tongue rest.'],
        [150, 'Notice your neck and throat. Breathe into any tightness and let it go.'],
        [175, 'Your shoulders. Let them drop away from your ears, a little more with each exhale.'],
        [205, 'Feel your arms, from the shoulders down to the elbows, the wrists, and the hands. Let them grow heavy and warm.'],
        [240, 'Bring attention to your chest. Feel it rise and fall with each breath.'],
        [270, 'Now the belly. Let it be soft. Nothing to hold in.'],
        [300, 'Your upper back… and your lower back. Imagine the breath flowing into any tension and melting it.'],
        [335, 'Notice your hips and pelvis. Let them settle and release.'],
        [365, 'Move down through the thighs… the knees… and the calves.'],
        [395, 'Feel your ankles, the soles of your feet, and each of your toes.'],
        [425, 'Now sense your whole body at once, breathing, resting, completely supported.'],
        [460, 'If any area still holds tension, send it one more slow breath.'],
        [500, 'Rest here in stillness. There is nothing you need to do.'],
        [560, 'Begin to deepen your breath. Gently wiggle your fingers and toes.'],
        [585, 'When you are ready, slowly open your eyes. Thank you for taking this time.']
      ]
    },
    {
      id: 'loving-kindness', name: 'Loving-Kindness', tag: 'Metta — warmth for yourself and others', minutes: 8, ambient: 'drone', icon: 'heart',
      about: 'A traditional practice of offering kind wishes — first to yourself, then to others. Shown to increase positive emotions and reduce self-criticism.',
      script: [
        [2, 'Settle into a comfortable position and close your eyes.'],
        [12, 'Take a few deep breaths, and let your body relax.'],
        [30, 'Place a hand on your heart if you like. Feel its warmth.'],
        [45, 'Bring to mind an image of yourself, just as you are right now.'],
        [60, 'Silently repeat: May I be happy. May I be healthy. May I be safe. May I live with ease.'],
        [95, 'Let the words land softly. If feelings arise, simply welcome them.'],
        [120, 'Now think of someone you love, someone who easily makes you smile.'],
        [140, 'Picture them clearly, and offer them these wishes: May you be happy. May you be healthy. May you be safe. May you live with ease.'],
        [190, 'Now bring to mind someone neutral — a neighbour, a shop assistant, someone you barely know.'],
        [210, 'They too want to be happy, just like you. May you be happy. May you be healthy. May you be safe. May you live with ease.'],
        [260, 'If you feel ready, think of someone you find difficult. Start with someone only mildly challenging.'],
        [280, 'Recognise that they also struggle, and also wish to be free of suffering. May you be happy. May you be at peace.'],
        [335, 'Now let your kindness expand outward, to everyone in your home, your city, your country.'],
        [365, 'To all beings everywhere: May all beings be happy. May all beings be healthy. May all beings be safe. May all beings live with ease.'],
        [420, 'Rest in this feeling of warmth and connection.'],
        [460, 'Take a deep breath, and gently open your eyes.']
      ]
    },
    {
      id: 'stress-sos', name: 'Stress SOS', tag: 'Three minutes back to calm', minutes: 3, ambient: 'rain', icon: 'alert',
      about: 'A quick reset for overwhelming moments: slow the breath, ground through the senses, and soften the body.',
      script: [
        [2, 'You are here. You are safe in this moment. Let’s slow things down together.'],
        [12, 'Breathe in through the nose for four… two, three, four.'],
        [18, 'And out slowly through the mouth… two, three, four, five, six.'],
        [28, 'Again. In… and a long, slow out.'],
        [42, 'Feel your feet on the ground. Press them down gently. Notice the floor supporting you.'],
        [60, 'Look around, or imagine your space. Name five things you can see.'],
        [80, 'Now four things you can feel. Your clothes, the air, your hands, your seat.'],
        [100, 'Three things you can hear.'],
        [115, 'Drop your shoulders. Unclench your jaw. Let your hands go loose.'],
        [130, 'Breathe in… and sigh it out.'],
        [145, 'Whatever is happening, you can take the next step from here, calmly.'],
        [165, 'One more slow breath. Well done.']
      ]
    },
    {
      id: 'sleep-wind-down', name: 'Sleep Wind-Down', tag: 'Let the day go and drift off', minutes: 10, ambient: 'rain', icon: 'bed',
      about: 'Lie down in bed, lights off. This practice slows your breath and loosens your grip on the day so sleep can arrive on its own.',
      script: [
        [2, 'Lie down and get completely comfortable. This is your time to rest.'],
        [15, 'Let your eyes close. Let your body sink into the bed.'],
        [30, 'Breathe in gently… and breathe out slowly, a little longer than the in-breath.'],
        [55, 'With each exhale, let yourself become a little heavier.'],
        [80, 'Think back over your day, like watching clouds pass. No need to hold on to any of it.'],
        [120, 'Whatever was left undone can wait until tomorrow. Right now, there is only rest.'],
        [160, 'Feel your feet become heavy and warm… your legs… your hips.'],
        [200, 'Your belly rises and falls on its own. Your chest softens.'],
        [240, 'Your arms are heavy. Your hands are still.'],
        [280, 'Your face is smooth and relaxed. Your jaw is loose.'],
        [320, 'Imagine you are lying somewhere peaceful — perhaps by a calm sea, or under a warm blanket while rain falls outside.'],
        [380, 'Count your breaths backwards from fifty. If you lose count, simply begin again. There is no wrong way.'],
        [480, 'Let go of counting. Let go of effort. Drift.'],
        [570, 'Sleep well.']
      ]
    },
    {
      id: 'morning-intention', name: 'Morning Intention', tag: 'Start the day clear and focused', minutes: 5, ambient: 'drone', icon: 'sun',
      about: 'A short practice to wake up the body, clear the mind and set one simple intention for the day ahead.',
      script: [
        [2, 'Good morning. Sit up comfortably, and take a long stretch if you need one.'],
        [14, 'Take three energising breaths. In through the nose… out through the mouth.'],
        [35, 'Now let your breath settle. Notice how your body feels this morning, without judging.'],
        [60, 'Bring to mind one thing you are grateful for. It can be very small.'],
        [90, 'Let that feeling of gratitude spread through your chest.'],
        [115, 'Now ask yourself: how do I want to show up today?'],
        [140, 'Choose a single word or short phrase as your intention. Patient. Focused. Kind. Present.'],
        [170, 'Silently repeat your intention a few times, letting it sink in.'],
        [210, 'Imagine moving through your day guided by this intention.'],
        [250, 'Take one more deep breath, carrying your intention with you.'],
        [280, 'Open your eyes. Have a wonderful day.']
      ]
    },
    {
      id: 'yoga-nidra', name: 'Yoga Nidra (Short)', tag: 'Yogic sleep — deep, conscious rest', minutes: 12, ambient: 'drone', icon: 'moon',
      about: 'A guided practice of deep relaxation while staying aware. Lie in Shavasana. Even a short session can feel like a long nap.',
      script: [
        [2, 'Lie on your back in Shavasana. Arms by your sides, palms up. Cover yourself if it is cool.'],
        [18, 'Make any final adjustments. From now on, try to remain still.'],
        [32, 'Say silently to yourself: I am going to practise Yoga Nidra. I will remain awake and aware.'],
        [50, 'Now choose a sankalpa, a short positive resolve, such as: I am calm and at peace. Repeat it three times with feeling.'],
        [85, 'We will now rotate awareness through the body. Simply let your attention move to each part as it is named.'],
        [100, 'Right hand thumb… second finger… third… fourth… fifth. Palm of the hand… back of the hand… wrist… elbow… shoulder.'],
        [140, 'Right side of the waist… hip… thigh… knee… calf… ankle… heel… sole of the foot… toes.'],
        [180, 'Left hand thumb… second finger… third… fourth… fifth. Palm… back of the hand… wrist… elbow… shoulder.'],
        [220, 'Left side of the waist… hip… thigh… knee… calf… ankle… heel… sole… toes.'],
        [260, 'Back of the head… the spine… the whole back. Forehead… eyebrows… eyes… nose… lips… chin.'],
        [300, 'The whole right side of the body. The whole left side. The whole body together.'],
        [330, 'Become aware of your natural breath. Count backwards from twenty-seven, saying: breathing in, twenty-seven… breathing out, twenty-seven… and so on.'],
        [430, 'Let the counting go. Feel the body becoming very heavy, as if sinking into the earth.'],
        [470, 'Now feel the body becoming very light, as if floating.'],
        [510, 'Rest in awareness. Just being. Nothing to do.'],
        [600, 'Remember your sankalpa, and repeat it three times with feeling.'],
        [640, 'Slowly become aware of the room around you. The floor beneath you. Sounds.'],
        [670, 'Begin to move your fingers and toes. Stretch if you like. Roll to your side before you sit up.'],
        [700, 'The practice of Yoga Nidra is complete.']
      ]
    }
  ];
  MEDITATIONS.forEach((m) => { m.duration = m.minutes * 60; });
  window.Meditations = { list: MEDITATIONS, get: (id) => MEDITATIONS.find((m) => m.id === id) };
})();
