// Mapping table v1. Frozen once shipped — see MAPPING_VERSION in constants.ts.
//
// Questions are data. The renderer never reads this file; it reads params.
// Editing a vote here changes every sphere ever generated under v1, so changes
// go in a new version file instead.
//
// Layer 1 (b01–b50) votes on the four axes. Twelve questions per axis, each
// spanning the full -1…+1 range across its four options, so a consistent
// answerer lands near a pole and a mixed answerer lands near zero.
//
// Layer 2 (s01–s50) nudges motion params directly. shearIndex gets ten
// questions — more than any other single param — because counter-rotating
// bands are the most legible metaphor in the system (§4.2).

import type { AxisName, QuestionMapping } from "../types";

type Votes = Partial<Record<AxisName, number>>;
type Nudges = Partial<Record<string, number>>;

function l1(
  id: string,
  prompt: string,
  options: Array<[string, Votes] | [string, Votes, Nudges]>,
): QuestionMapping {
  return {
    id,
    layer: 1,
    prompt,
    options: options.map(([label, axisVotes, paramNudges]) => ({
      label,
      axisVotes,
      ...(paramNudges ? { paramNudges } : {}),
    })),
  };
}

function l2(id: string, prompt: string, options: Array<[string, Nudges]>): QuestionMapping {
  return {
    id,
    layer: 2,
    prompt,
    options: options.map(([label, paramNudges]) => ({ label, paramNudges })),
  };
}

// ── Layer 1 · Illumination — where the light comes from ──────────

const illumination: QuestionMapping[] = [
  l1("b01", "When you need to recharge, what actually works?", [
    ["Being completely alone", { illumination: 0.9 }, { halo: -0.3 }],
    ["One person, low stakes", { illumination: 0.35 }],
    ["A few friends, easy company", { illumination: -0.35 }],
    ["A crowd, somewhere loud", { illumination: -0.9 }, { halo: 0.3 }],
  ]),
  l1("b02", "Where does your sense of how you're doing come from?", [
    ["Your own read, mostly", { illumination: 0.9 }],
    ["Your read, checked against others", { illumination: 0.35 }],
    ["How people respond to you", { illumination: -0.5 }],
    ["Results other people can see", { illumination: -0.9 }],
  ]),
  l1("b03", "Before a decision that matters, you", [
    ["Sit with it alone until it settles", { illumination: 0.9 }, { depth: 0.3 }],
    ["Write it out and read it back", { illumination: 0.4 }],
    ["Talk it through with one person", { illumination: -0.4 }],
    ["Ask everyone you trust", { illumination: -0.9 }],
  ]),
  l1("b04", "In a room of strangers, your default is to", [
    ["Watch from the edge", { illumination: 0.8 }],
    ["Find one person and stay there", { illumination: 0.3 }],
    ["Move around, be pleasant", { illumination: -0.5 }],
    ["Become the room", { illumination: -0.95 }],
  ]),
  l1("b05", "Your best thinking happens", [
    ["In your head, walking", { illumination: 0.9 }],
    ["On the page", { illumination: 0.35 }],
    ["Out loud, in conversation", { illumination: -0.6 }],
    ["In front of people", { illumination: -0.9 }],
  ]),
  l1("b06", "Praise from someone you respect", [
    ["Is nice, but doesn't move your own read", { illumination: 0.8 }],
    ["Lands warmly and passes", { illumination: 0.2 }],
    ["Genuinely recalibrates you", { illumination: -0.5 }],
    ["You run on it for weeks", { illumination: -0.9 }],
  ]),
  l1("b07", "You've made something you're proud of. Next you", [
    ["Keep it to yourself a while", { illumination: 0.9 }, { depth: 0.25 }],
    ["Show one person", { illumination: 0.3 }],
    ["Share it with your circle", { illumination: -0.4 }],
    ["Put it where everyone can see", { illumination: -0.9 }],
  ]),
  l1("b08", "When something is wrong, the people around you", [
    ["Almost never know", { illumination: 0.9 }, { depth: 0.3 }],
    ["Know if they're close to you", { illumination: 0.3 }],
    ["Can usually tell", { illumination: -0.4 }],
    ["Know before you do", { illumination: -0.9 }],
  ]),
  l1("b09", "At the end of a full day of people, you feel", [
    ["Emptied out", { illumination: 0.9 }],
    ["Quiet, but fine", { illumination: 0.3 }],
    ["Pleasantly tired", { illumination: -0.3 }],
    ["Lit up", { illumination: -0.9 }],
  ]),
  l1("b10", "The mood of a room", [
    ["Barely registers", { illumination: 0.85 }],
    ["You notice it, it doesn't move you", { illumination: 0.3 }],
    ["Colours how you feel", { illumination: -0.5 }],
    ["Becomes how you feel", { illumination: -0.95 }],
  ]),
  l1("b11", "A silence in conversation is", [
    ["Comfortable", { illumination: 0.8 }],
    ["Fine for a moment", { illumination: 0.25 }],
    ["Slightly uneasy", { illumination: -0.4 }],
    ["Yours to fill", { illumination: -0.85 }],
  ]),
  l1("b12", "What actually moves you to do things", [
    ["Something you're chasing that's yours alone", { illumination: 0.9 }],
    ["Curiosity", { illumination: 0.35 }],
    ["People counting on you", { illumination: -0.5 }],
    ["Being seen doing it well", { illumination: -0.9 }],
  ]),
];

// ── Layer 1 · Edge — how defined your boundaries are ─────────────

const edge: QuestionMapping[] = [
  l1("b13", "Your week, on a calendar", [
    ["Blocked out precisely", { edge: -0.9 }],
    ["A few fixed anchors", { edge: -0.3 }],
    ["Loose intentions", { edge: 0.4 }],
    ["Whatever the day brings", { edge: 0.9 }],
  ]),
  l1("b14", "A plan changes at the last minute", [
    ["Genuinely irritating", { edge: -0.9 }],
    ["You adjust, with effort", { edge: -0.3 }],
    ["Fine", { edge: 0.4 }],
    ["Better than the plan", { edge: 0.85 }],
  ]),
  l1("b15", "Where you work looks like", [
    ["Everything in its place", { edge: -0.9 }],
    ["Tidy enough", { edge: -0.3 }],
    ["Organised chaos", { edge: 0.5 }],
    ["An excavation site", { edge: 0.9 }],
  ]),
  l1("b16", "You describe yourself in", [
    ["Precise terms", { edge: -0.85 }],
    ["A few clear labels", { edge: -0.3 }],
    ["Whatever fits who's asking", { edge: 0.5 }],
    ["Nothing that holds still", { edge: 0.9 }],
  ]),
  l1("b17", "Rules you never agreed to", [
    ["Exist for a reason. Follow them", { edge: -0.85 }],
    ["Follow them, mostly", { edge: -0.3 }],
    ["Bend where it's sensible", { edge: 0.45 }],
    ["Are suggestions", { edge: 0.9 }],
  ]),
  l1("b18", "Beginnings and endings, for you", [
    ["Are clean breaks", { edge: -0.9 }],
    ["Are tidy where possible", { edge: -0.3 }],
    ["Blur at the edges", { edge: 0.5 }],
    ["Never really happen", { edge: 0.9 }],
  ]),
  l1("b19", "Asked what you do, you give", [
    ["One crisp sentence", { edge: -0.85 }],
    ["A short answer", { edge: -0.3 }],
    ["Something that depends on the day", { edge: 0.45 }],
    ["A long pause", { edge: 0.85 }],
  ]),
  l1("b20", "Your opinions are", [
    ["Firm and well defined", { edge: -0.85 }],
    ["Settled, but revisable", { edge: -0.25 }],
    ["Dependent on context", { edge: 0.5 }],
    ["In motion", { edge: 0.9 }],
  ]),
  l1("b21", "Deadlines", [
    ["You finish early", { edge: -0.9 }],
    ["You finish on time", { edge: -0.35 }],
    ["You finish at the wire", { edge: 0.4 }],
    ["Are approximate", { edge: 0.85 }],
  ]),
  l1("b22", "Work and the rest of your life are", [
    ["Strictly separate", { edge: -0.9 }],
    ["Mostly separate", { edge: -0.3 }],
    ["Overlapping", { edge: 0.45 }],
    ["One thing", { edge: 0.9 }],
  ]),
  l1("b23", "Your taste is", [
    ["Specific and consistent", { edge: -0.8 }],
    ["Fairly defined", { edge: -0.25 }],
    ["Broad", { edge: 0.45 }],
    ["Whatever the mood wants", { edge: 0.85 }],
  ]),
  l1("b24", "A conversation wanders off the subject", [
    ["You steer it back", { edge: -0.85 }],
    ["You redirect gently", { edge: -0.3 }],
    ["You enjoy it", { edge: 0.5 }],
    ["That was the point", { edge: 0.9 }],
  ]),
];

// ── Layer 1 · Volatility — how constant your intensity is ────────

const volatility: QuestionMapping[] = [
  l1("b25", "Your energy across a week", [
    ["Barely varies", { volatility: -0.9 }],
    ["Varies a little", { volatility: -0.35 }],
    ["Has real peaks", { volatility: 0.4 }],
    ["Is peaks and crashes", { volatility: 0.9 }],
  ]),
  l1("b26", "The things you're interested in", [
    ["Have been the same for years", { volatility: -0.9 }],
    ["Evolve slowly", { volatility: -0.3 }],
    ["Rotate", { volatility: 0.45 }],
    ["Consume you, then vanish", { volatility: 0.9 }],
  ]),
  l1("b27", "You work", [
    ["A steady amount every day", { volatility: -0.9 }],
    ["Regularly, with occasional pushes", { volatility: -0.3 }],
    ["In bursts", { volatility: 0.5 }],
    ["All night, then not at all", { volatility: 0.9 }],
  ]),
  l1("b28", "Someone who knew you ten years ago would find you", [
    ["Exactly the same", { volatility: -0.9 }],
    ["Recognisably the same", { volatility: -0.35 }],
    ["Noticeably different", { volatility: 0.4 }],
    ["Someone else", { volatility: 0.85 }],
  ]),
  l1("b29", "Your moods are", [
    ["Level", { volatility: -0.9 }],
    ["Gently variable", { volatility: -0.3 }],
    ["Swinging", { volatility: 0.5 }],
    ["Weather systems", { volatility: 0.9 }],
  ]),
  l1("b30", "When you get excited about something, it", [
    ["Lasts for years", { volatility: -0.85 }],
    ["Settles into something warm", { volatility: -0.3 }],
    ["Burns bright for a while", { volatility: 0.5 }],
    ["Is a fever, and then it's over", { volatility: 0.9 }],
  ]),
  l1("b31", "Your sleep", [
    ["The same hours every night", { volatility: -0.85 }],
    ["Roughly regular", { volatility: -0.3 }],
    ["Varies a lot", { volatility: 0.45 }],
    ["Has no pattern at all", { volatility: 0.85 }],
  ]),
  l1("b32", "Big feelings are", [
    ["Rare for you", { volatility: -0.85 }],
    ["Occasional", { volatility: -0.3 }],
    ["Frequent", { volatility: 0.5 }],
    ["The baseline", { volatility: 0.9 }],
  ]),
  l1("b33", "Your last five years look like", [
    ["A straight line", { volatility: -0.85 }],
    ["A gentle curve", { volatility: -0.3 }],
    ["A set of distinct chapters", { volatility: 0.4 }],
    ["A series of detonations", { volatility: 0.9 }],
  ]),
  l1("b34", "Under real pressure you are", [
    ["Exactly as you always are", { volatility: -0.9 }],
    ["A little tighter", { volatility: -0.3 }],
    ["Sharper, then spent", { volatility: 0.5 }],
    ["A different person", { volatility: 0.9 }],
  ]),
  l1("b35", "Dropped somewhere new, you", [
    ["Keep your routines intact", { volatility: -0.85 }],
    ["Adapt slowly", { volatility: -0.3 }],
    ["Change quickly", { volatility: 0.45 }],
    ["Become someone the trip invented", { volatility: 0.85 }],
  ]),
  l1("b36", "What you produce is", [
    ["Reliable, and of similar quality", { volatility: -0.85 }],
    ["Consistent", { volatility: -0.3 }],
    ["Uneven, occasionally excellent", { volatility: 0.5 }],
    ["Nothing, or extraordinary", { volatility: 0.9 }],
  ]),
];

// ── Layer 1 · Colour relation — whether your parts agree ─────────

const colorRelation: QuestionMapping[] = [
  l1("b37", "The you at work and the you at home are", [
    ["Identical", { colorRelation: -0.9 }],
    ["Similar", { colorRelation: -0.35 }],
    ["Quite different", { colorRelation: 0.5 }],
    ["Strangers to each other", { colorRelation: 0.95 }],
  ]),
  l1("b38", "Holding two beliefs that contradict each other", [
    ["Is uncomfortable. You resolve it", { colorRelation: -0.85 }],
    ["Means you pick one", { colorRelation: -0.3 }],
    ["Is normal", { colorRelation: 0.5 }],
    ["Is interesting", { colorRelation: 0.9 }],
  ]),
  l1("b39", "Your values and your behaviour are", [
    ["Aligned", { colorRelation: -0.85 }],
    ["Mostly aligned", { colorRelation: -0.3 }],
    ["Often at odds", { colorRelation: 0.5 }],
    ["At war", { colorRelation: 0.9 }],
  ]),
  l1("b40", "What you love — music, art, whatever it is — is", [
    ["One coherent taste", { colorRelation: -0.85 }],
    ["A clear lane", { colorRelation: -0.3 }],
    ["Wildly unrelated things", { colorRelation: 0.5 }],
    ["Deliberate opposites", { colorRelation: 0.9 }],
  ]),
  l1("b41", "Someone describing you to a friend would need", [
    ["One word", { colorRelation: -0.85 }],
    ["A short list that fits together", { colorRelation: -0.3 }],
    ["A list that contradicts itself", { colorRelation: 0.5 }],
    ["Two different people", { colorRelation: 0.9 }],
  ]),
  l1("b42", "Your private self and your public self are", [
    ["The same", { colorRelation: -0.9 }],
    ["Close", { colorRelation: -0.3 }],
    ["Different", { colorRelation: 0.5 }],
    ["Opposites", { colorRelation: 0.95 }],
  ]),
  l1("b43", "You disagree with everyone in the room. You", [
    ["Look for the common ground", { colorRelation: -0.8 }],
    ["Soften it", { colorRelation: -0.3 }],
    ["Say it plainly", { colorRelation: 0.5 }],
    ["Enjoy the friction", { colorRelation: 0.9 }],
  ]),
  l1("b44", "You'd rather things be", [
    ["Harmonious", { colorRelation: -0.9 }],
    ["Calm", { colorRelation: -0.35 }],
    ["Interesting", { colorRelation: 0.4 }],
    ["Charged", { colorRelation: 0.85 }],
  ]),
  l1("b45", "Extremes", [
    ["You avoid them", { colorRelation: -0.85 }],
    ["You moderate them", { colorRelation: -0.3 }],
    ["Draw you", { colorRelation: 0.5 }],
    ["Are where you live", { colorRelation: 0.9 }],
  ]),
  l1("b46", "The parts of your life", [
    ["Fit together", { colorRelation: -0.9 }],
    ["Mostly fit", { colorRelation: -0.3 }],
    ["Sit awkwardly beside each other", { colorRelation: 0.5 }],
    ["Don't belong to the same person", { colorRelation: 0.9 }],
  ]),
  l1("b47", "Compromise is", [
    ["The whole point", { colorRelation: -0.85 }],
    ["Usually right", { colorRelation: -0.3 }],
    ["Often a loss", { colorRelation: 0.45 }],
    ["A way of losing twice", { colorRelation: 0.85 }],
  ]),
  l1("b48", "When you love something you love it", [
    ["Steadily", { colorRelation: -0.8 }],
    ["Warmly", { colorRelation: -0.3 }],
    ["Fiercely, against something else", { colorRelation: 0.5 }],
    ["And resent it", { colorRelation: 0.9 }],
  ]),
];

// ── Layer 1 · Form — structural nudges, no axis votes ────────────

const form: QuestionMapping[] = [
  l1("b49", "When something matters to you, where do you feel it?", [
    ["Behind the eyes, at the top", {}, { activityCenter: -0.9, axialTilt: -0.3 }],
    ["In the chest, dead centre", {}, { activityCenter: 0, asymmetry: -0.4 }],
    ["Off to one side, uneven", {}, { activityCenter: 0.9, asymmetry: 0.6, axialTilt: 0.5 }],
    ["Everywhere at once", {}, { activityCenter: 0.2, asymmetry: 0.2, bandCount: -0.3 }],
  ]),
  l1("b50", "People who meet you sense", [
    ["Nothing until you speak", {}, { halo: -0.9, lightSource: -0.3 }],
    ["A quiet steadiness", {}, { halo: -0.2 }],
    ["A presence, before you say anything", {}, { halo: 0.5, lightSource: 0.2 }],
    ["That you arrived before you arrived", {}, { halo: 0.95, lightSource: 0.4, axialTilt: 0.3 }],
  ]),
];

// ── Layer 2 · Shear — the headline. Ten questions (§4.2). ────────

const shear: QuestionMapping[] = [
  l2("s01", "Right now, are you pulled in two directions?", [
    ["Not at all", { shearIndex: -0.95 }],
    ["Mildly", { shearIndex: -0.3 }],
    ["Yes, most days", { shearIndex: 0.6, turbulenceAmplitude: 0.2 }],
    ["Constantly, and it's tiring", { shearIndex: 0.95, turbulenceAmplitude: 0.4 }],
  ]),
  l2("s02", "Two things you want that don't fit together", [
    ["Nothing like that", { shearIndex: -0.9 }],
    ["One small one", { shearIndex: -0.25 }],
    ["Yes, and it's unresolved", { shearIndex: 0.6 }],
    ["That's the whole situation", { shearIndex: 0.95 }],
  ]),
  l2("s03", "Your head and your gut, currently", [
    ["Agree", { shearIndex: -0.9, coherence: 0.3 }],
    ["Mostly agree", { shearIndex: -0.3 }],
    ["Disagree", { shearIndex: 0.6 }],
    ["Are openly at war", { shearIndex: 0.95, turbulenceAmplitude: 0.3 }],
  ]),
  l2("s04", "A decision you keep not making", [
    ["There isn't one", { shearIndex: -0.9 }],
    ["One, and it's minor", { shearIndex: -0.2 }],
    ["One, and it's heavy", { shearIndex: 0.65 }],
    ["Several", { shearIndex: 0.95, turbulenceScale: 0.3 }],
  ]),
  l2("s05", "What you're doing, versus what you think you should be doing", [
    ["The same thing", { shearIndex: -0.95 }],
    ["Close enough", { shearIndex: -0.3 }],
    ["There's a gap", { shearIndex: 0.6 }],
    ["Opposites", { shearIndex: 0.95, accentIntensity: 0.2 }],
  ]),
  l2("s06", "Loyal to two things that want different things from you", [
    ["No", { shearIndex: -0.9 }],
    ["A little", { shearIndex: -0.25 }],
    ["Yes", { shearIndex: 0.65 }],
    ["And it's tearing", { shearIndex: 0.95, turbulenceAmplitude: 0.35 }],
  ]),
  l2("s07", "Part of you wants to leave. Part wants to stay.", [
    ["Neither", { shearIndex: -0.9 }],
    ["Faintly", { shearIndex: -0.25 }],
    ["Yes", { shearIndex: 0.6 }],
    ["Both, loudly", { shearIndex: 0.95 }],
  ]),
  l2("s08", "Lately, when you say yes, you mean", [
    ["Yes", { shearIndex: -0.9 }],
    ["Mostly yes", { shearIndex: -0.3 }],
    ["Yes and no", { shearIndex: 0.6 }],
    ["No", { shearIndex: 0.9, accentIntensity: -0.2 }],
  ]),
  l2("s09", "Your days pull you", [
    ["In one direction", { shearIndex: -0.9, coherence: 0.3 }],
    ["Roughly one direction", { shearIndex: -0.3 }],
    ["Several ways", { shearIndex: 0.6, speedVariance: 0.3 }],
    ["Apart", { shearIndex: 0.95, speedVariance: 0.5 }],
  ]),
  l2("s10", "A friend describing your situation would call it", [
    ["Clear and settled", { shearIndex: -0.9 }],
    ["Mostly clear", { shearIndex: -0.3 }],
    ["Complicated", { shearIndex: 0.6 }],
    ["A contradiction", { shearIndex: 0.95 }],
  ]),
];

// ── Layer 2 · Speed, turbulence, coherence, scale, variance ──────

const tempo: QuestionMapping[] = [
  l2("s11", "The pace of your last two weeks", [
    ["Still", { globalSpeed: -0.95 }],
    ["Slow", { globalSpeed: -0.4 }],
    ["Quick", { globalSpeed: 0.5 }],
    ["A blur", { globalSpeed: 0.95, turbulenceAmplitude: 0.3 }],
  ]),
  l2("s12", "How full is the week ahead?", [
    ["Empty", { globalSpeed: -0.8 }],
    ["Manageable", { globalSpeed: -0.3 }],
    ["Full", { globalSpeed: 0.5 }],
    ["Overflowing", { globalSpeed: 0.9, turbulenceScale: 0.3 }],
  ]),
  l2("s13", "How fast is everything around you changing?", [
    ["Nothing changes", { globalSpeed: -0.9, coherence: 0.4 }],
    ["Slowly", { globalSpeed: -0.35, coherence: 0.2 }],
    ["Fast", { globalSpeed: 0.55, coherence: -0.2 }],
    ["Faster than you can track", { globalSpeed: 0.95, coherence: -0.5 }],
  ]),
  l2("s14", "Mornings, currently", [
    ["You wake early and lie still", { globalSpeed: -0.7 }],
    ["Gentle", { globalSpeed: -0.3 }],
    ["You hit the ground moving", { globalSpeed: 0.6 }],
    ["You're already behind", { globalSpeed: 0.9, turbulenceAmplitude: 0.3 }],
  ]),
  l2("s15", "How much of today belonged to you?", [
    ["All of it", { globalSpeed: -0.6 }],
    ["Most of it", { globalSpeed: -0.2 }],
    ["Very little", { globalSpeed: 0.5, shearIndex: 0.2 }],
    ["None", { globalSpeed: 0.85, shearIndex: 0.4 }],
  ]),
  l2("s16", "The last time you sat with nothing to do", [
    ["Today", { globalSpeed: -0.8 }],
    ["This week", { globalSpeed: -0.3 }],
    ["You can't remember", { globalSpeed: 0.6 }],
    ["The idea is absurd", { globalSpeed: 0.9 }],
  ]),
  l2("s17", "Right now you feel", [
    ["Becalmed", { globalSpeed: -0.9 }],
    ["Settled", { globalSpeed: -0.35 }],
    ["Busy", { globalSpeed: 0.5 }],
    ["Swept along", { globalSpeed: 0.95, coherence: -0.3 }],
  ]),

  l2("s18", "Your inner weather today", [
    ["Glass", { turbulenceAmplitude: -0.95 }],
    ["Calm", { turbulenceAmplitude: -0.4 }],
    ["Choppy", { turbulenceAmplitude: 0.55 }],
    ["Churning", { turbulenceAmplitude: 0.95 }],
  ]),
  l2("s19", "How much noise is in your head?", [
    ["Quiet", { turbulenceAmplitude: -0.9 }],
    ["Background hum", { turbulenceAmplitude: -0.35 }],
    ["Loud", { turbulenceAmplitude: 0.6, shearIndex: 0.15 }],
    ["A crowd", { turbulenceAmplitude: 0.95, turbulenceScale: 0.4, shearIndex: 0.3 }],
  ]),
  l2("s20", "Falling asleep, lately", [
    ["Instantly", { turbulenceAmplitude: -0.85 }],
    ["Fine", { turbulenceAmplitude: -0.3 }],
    ["It takes a while", { turbulenceAmplitude: 0.5 }],
    ["You don't", { turbulenceAmplitude: 0.9, globalSpeed: 0.2 }],
  ]),
  l2("s21", "Small things", [
    ["Don't reach you", { turbulenceAmplitude: -0.85 }],
    ["Pass through", { turbulenceAmplitude: -0.3 }],
    ["Snag", { turbulenceAmplitude: 0.55, turbulenceScale: 0.3 }],
    ["Tip you over", { turbulenceAmplitude: 0.9, turbulenceScale: 0.5 }],
  ]),
  l2("s22", "Your last week, felt from the inside", [
    ["Smooth", { turbulenceAmplitude: -0.9 }],
    ["Steady", { turbulenceAmplitude: -0.3 }],
    ["Rough", { turbulenceAmplitude: 0.55, shearIndex: 0.2 }],
    ["Violent", { turbulenceAmplitude: 0.95, accentIntensity: 0.3, shearIndex: 0.35 }],
  ]),
  l2("s23", "How settled is your body?", [
    ["Completely", { turbulenceAmplitude: -0.9 }],
    ["Fine", { turbulenceAmplitude: -0.3 }],
    ["Restless", { turbulenceAmplitude: 0.55 }],
    ["You can't sit still", { turbulenceAmplitude: 0.9, globalSpeed: 0.3 }],
  ]),

  l2("s24", "Do your days resemble each other?", [
    ["They're identical", { coherence: 0.95 }],
    ["Similar", { coherence: 0.4 }],
    ["Different", { coherence: -0.5 }],
    ["No two alike", { coherence: -0.95, speedVariance: 0.3 }],
  ]),
  l2("s25", "The story you'd tell about your life right now", [
    ["Holds together", { coherence: 0.9 }],
    ["Mostly holds", { coherence: 0.35 }],
    ["Keeps changing", { coherence: -0.55 }],
    ["You don't have one", { coherence: -0.95 }],
  ]),
  l2("s26", "Plans you made a month ago", [
    ["Still stand", { coherence: 0.9 }],
    ["Mostly stand", { coherence: 0.35 }],
    ["Have shifted", { coherence: -0.5 }],
    ["Are unrecognisable", { coherence: -0.9, globalSpeed: 0.2 }],
  ]),
  l2("s27", "What you want", [
    ["Hasn't changed in years", { coherence: 0.9 }],
    ["Is stable", { coherence: 0.35 }],
    ["Changes by the week", { coherence: -0.55 }],
    ["Changes by the hour", { coherence: -0.95, shearIndex: 0.3 }],
  ]),
  l2("s28", "You know what tomorrow looks like", [
    ["Exactly", { coherence: 0.9 }],
    ["Roughly", { coherence: 0.35 }],
    ["Vaguely", { coherence: -0.45 }],
    ["Not at all", { coherence: -0.9 }],
  ]),
  l2("s29", "How you'd describe yourself has", [
    ["Not changed lately", { coherence: 0.85 }],
    ["Shifted slightly", { coherence: 0.3 }],
    ["Changed a lot", { coherence: -0.55 }],
    ["Been rewritten this year", { coherence: -0.95 }],
  ]),

  l2("s30", "What occupies you is", [
    ["One large thing", { turbulenceScale: -0.9 }],
    ["A couple of big things", { turbulenceScale: -0.35 }],
    ["Many small things", { turbulenceScale: 0.6 }],
    ["A thousand details", { turbulenceScale: 0.95 }],
  ]),
  l2("s31", "Your worries are", [
    ["One, and it's large", { turbulenceScale: -0.9, turbulenceAmplitude: 0.2 }],
    ["A few, significant", { turbulenceScale: -0.3 }],
    ["Many, small", { turbulenceScale: 0.6 }],
    ["Uncountable", { turbulenceScale: 0.95, turbulenceAmplitude: 0.3 }],
  ]),
  l2("s32", "Your attention lately", [
    ["Holds on one thing", { turbulenceScale: -0.85, coherence: 0.3 }],
    ["Moves between a few", { turbulenceScale: -0.3 }],
    ["Scatters", { turbulenceScale: 0.6, coherence: -0.3 }],
    ["Fragments", { turbulenceScale: 0.95, coherence: -0.5 }],
  ]),
  l2("s33", "Interruptions", [
    ["Are rare", { turbulenceScale: -0.8 }],
    ["Happen a few times a day", { turbulenceScale: -0.3 }],
    ["Are constant", { turbulenceScale: 0.6, globalSpeed: 0.2 }],
    ["Are the day", { turbulenceScale: 0.9, globalSpeed: 0.4 }],
  ]),

  l2("s34", "Is everything in your life moving at the same pace?", [
    ["Yes", { speedVariance: -0.9 }],
    ["Roughly", { speedVariance: -0.35 }],
    ["No", { speedVariance: 0.55, shearIndex: 0.2 }],
    ["Wildly different speeds", { speedVariance: 0.95, shearIndex: 0.4 }],
  ]),
  l2("s35", "Something in your life is stuck while something else races", [
    ["No", { speedVariance: -0.9 }],
    ["A little", { speedVariance: -0.3 }],
    ["Yes", { speedVariance: 0.6, shearIndex: 0.2 }],
    ["Exactly that", { speedVariance: 0.95, shearIndex: 0.4 }],
  ]),
  l2("s36", "Your week has", [
    ["An even rhythm", { speedVariance: -0.85 }],
    ["A rhythm", { speedVariance: -0.3 }],
    ["Spikes", { speedVariance: 0.55 }],
    ["No rhythm at all", { speedVariance: 0.9, coherence: -0.3 }],
  ]),
  l2("s37", "Work and your personal life are moving", [
    ["Together", { speedVariance: -0.85 }],
    ["Similarly", { speedVariance: -0.3 }],
    ["Out of step", { speedVariance: 0.55, shearIndex: 0.3 }],
    ["In different decades", { speedVariance: 0.9, shearIndex: 0.5 }],
  ]),
];

// ── Layer 2 · Protrusion, accent, spin sense ─────────────────────

const surface: QuestionMapping[] = [
  l2("s38", "Does anything about you break the surface right now?", [
    ["Nothing shows", { protrusionMode: -0.95, protrusionAmplitude: -0.8 }],
    ["A little", { protrusionMode: -0.2, protrusionAmplitude: -0.3 }],
    ["Yes, steadily", { protrusionMode: 0, protrusionAmplitude: 0.5 }],
    ["It comes and goes", { protrusionMode: 0.9, protrusionAmplitude: 0.6 }],
  ]),
  l2("s39", "When something rises in you, it", [
    ["Doesn't", { protrusionMode: -0.9, protrusionAmplitude: -0.7 }],
    ["Stays under", { protrusionMode: -0.4, protrusionAmplitude: -0.3 }],
    ["Arrives and stays", { protrusionMode: -0.05, protrusionLength: 0.6 }],
    ["Arrives and passes", { protrusionMode: 0.9, protrusionLength: -0.4 }],
  ]),
  l2("s40", "Your reactions, lately", [
    ["There aren't any", { protrusionMode: -0.9, protrusionAmplitude: -0.7 }],
    ["Muted", { protrusionAmplitude: -0.35 }],
    ["Always present", { protrusionMode: 0, protrusionAmplitude: 0.4 }],
    ["They surge, then subside", { protrusionMode: 0.9, protrusionFrequency: 0.4 }],
  ]),
  l2("s41", "How big are the moments?", [
    ["Nothing rises", { protrusionAmplitude: -0.9 }],
    ["Small", { protrusionAmplitude: -0.35 }],
    ["Noticeable", { protrusionAmplitude: 0.45 }],
    ["They take the whole day", { protrusionAmplitude: 0.9 }],
  ]),
  l2("s42", "When something does rise, it lasts", [
    ["Seconds", { protrusionLength: -0.9, protrusionFrequency: 0.7 }],
    ["Minutes", { protrusionLength: -0.3, protrusionFrequency: 0.3 }],
    ["Hours", { protrusionLength: 0.5, protrusionFrequency: -0.2 }],
    ["Days", { protrusionLength: 0.9, protrusionFrequency: -0.7 }],
  ]),
  l2("s43", "How often?", [
    ["Almost never", { protrusionFrequency: -0.9, protrusionMode: -0.4 }],
    ["Occasionally", { protrusionFrequency: -0.3 }],
    ["Often", { protrusionFrequency: 0.5, protrusionMode: 0.4 }],
    ["Several times a day", { protrusionFrequency: 0.95, protrusionMode: 0.8 }],
  ]),
  l2("s44", "Do people see it when it happens?", [
    ["No", { protrusionAmplitude: -0.6 }],
    ["Sometimes", { protrusionAmplitude: -0.1 }],
    ["Usually", { protrusionAmplitude: 0.4 }],
    ["Always", { protrusionAmplitude: 0.8, accentIntensity: 0.3 }],
  ]),
  l2("s45", "The shape of a hard moment, for you, right now", [
    ["A flat line", { protrusionMode: -0.9, protrusionAmplitude: -0.8 }],
    ["A low hum", { protrusionMode: -0.2, protrusionAmplitude: -0.2 }],
    ["A plateau", { protrusionMode: -0.05, protrusionAmplitude: 0.4, protrusionLength: 0.6 }],
    ["A spike", { protrusionMode: 0.9, protrusionAmplitude: 0.7, protrusionLength: -0.6 }],
  ]),

  l2("s46", "The colour of your days", [
    ["Washed out", { accentIntensity: -0.95 }],
    ["Muted", { accentIntensity: -0.4 }],
    ["Vivid", { accentIntensity: 0.5 }],
    ["Blazing", { accentIntensity: 0.95 }],
  ]),
  l2("s47", "How much are you feeling things right now?", [
    ["Numb", { accentIntensity: -0.9, turbulenceAmplitude: -0.3 }],
    ["Dulled", { accentIntensity: -0.35 }],
    ["Fully", { accentIntensity: 0.5 }],
    ["Too much", { accentIntensity: 0.95, turbulenceAmplitude: 0.3 }],
  ]),
  l2("s48", "Your last strong feeling was", [
    ["You can't remember", { accentIntensity: -0.85 }],
    ["A while ago", { accentIntensity: -0.3 }],
    ["Recently", { accentIntensity: 0.45 }],
    ["Right now", { accentIntensity: 0.9 }],
  ]),

  l2("s49", "Are you moving toward something, or away from something?", [
    ["Away. Unwinding", { rotationDirection: -0.9, globalSpeed: -0.2 }],
    ["Mostly away", { rotationDirection: -0.4 }],
    ["Mostly toward", { rotationDirection: 0.4 }],
    ["Toward. Gathering", { rotationDirection: 0.9, globalSpeed: 0.2 }],
  ]),
  l2("s50", "Time feels like it's", [
    ["Retracing itself", { rotationDirection: -0.9, coherence: -0.2 }],
    ["Circling", { rotationDirection: -0.3, coherence: 0.2 }],
    ["Advancing", { rotationDirection: 0.5 }],
    ["Pulling you forward", { rotationDirection: 0.9, globalSpeed: 0.3 }],
  ]),
];

export const MAPPING_V1: QuestionMapping[] = [
  ...illumination,
  ...edge,
  ...volatility,
  ...colorRelation,
  ...form,
  ...shear,
  ...tempo,
  ...surface,
];
