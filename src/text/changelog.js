/* ---------- Changelog and About (the owner's text, 2026-10-17) ----------
   Changelog entries follow Trimps' shape: version and date, then New content, Balance, Quality of life, Bug fixes.
   Each entry names the internal builds it covers. Newest first. Text outside the fiction: "rebirth" and "prestige" are both fine here. */
const CHANGELOG = [
  { version: '0.1.0', title: 'first playtest', date: 'October 19, 2026', internal: 'internal builds v1a to v1s',
    sections: [
      ['New content', [
        'The prologue',
        'The village: settlers, light, ideas, buildings, feasts, snails, and big projects.',
        'The map, part one: call back the land around your home, place by place and region by region. Copper, relics, and amplifier towers.',
        'Rebirth: memory and gifts that carry over.'
      ]],
      ['Quality of life', [
        'Save tools: download, copy as text, load from a file or text.',
        'Save reminder.',
        'User settings.'
      ]]
    ] }
];

const ABOUT = {
  lead: 'An incremental game about calling a land back from nothing. First playtest.',   // owner, 2026-10-17
  inspirations: 'Trimps, Kittens Game, NGU Idle, Sandcastle Builder, and so many other greats.',
  credits: [
    ['Design, writing and direction', 'Justin Davis'],
    ['Code', 'Written with Claude, Anthropic’s AI model, to Justin’s design'],
    ['Playtesters', 'Everyone playing this build. Thank you.']
  ],
  licences: [
    'The game’s code is open source under the MIT licence.',
    'The writing, names, story and art are © 2026 Justin Davis, all rights reserved.',
    'Fonts: Spectral and Cinzel (SIL Open Font License), served by Google Fonts. Large numbers: break_infinity.js (MIT).'
  ],
  privacy: 'Your game is saved in this browser and nowhere else, unless you download or copy it. The game collects no personal information. Its fonts come from Google Fonts and a number library from jsDelivr, which see your connection as any website does.',
  privacyCounts: 'It also sends a short anonymous note when a game reaches five points (starting, the village, the map, the first rebirth and the end of the playtest): which point, how long the game has been played, and the version. Nothing in it identifies you or your browser. It helps us see how far players get and how long it takes. You can turn it off in Settings.'
};
