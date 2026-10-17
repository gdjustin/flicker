/* ---------- Changelog and About (drafts by Claude, for the owner to approve) ----------
   Changelog entries follow Trimps' shape: version and date, then New content, Balance, Quality of life, Bug fixes.
   Each entry names the internal builds it covers. Newest first. Text outside the fiction: "rebirth" and "prestige" are both fine here. */
const CHANGELOG = [
  { version: '0.1.0', date: 'launch day', internal: 'internal builds v1a to v1s',
    title: 'The first public playtest',
    sections: [
      ['New content', [
        'The prologue: from a single mote of light to a self that can stand.',
        'The village: settlers and their work, ideas and upgrades, buildings, feasts, snails, and big projects carried in by haulers.',
        'The map, part one: call back the land around your home, place by place and region by region. Copper, relics, and amplifier towers that focus your light.',
        'Rebirth: start again with heartstones, memory and gifts that carry over.',
        'Time away: your village and your light keep working while you are gone, up to a limit you can raise.'
      ]],
      ['Quality of life', [
        'Save tools: download a copy, copy it as text, load from a file or text, and an automatic copy of the last save that loaded cleanly.',
        'A reminder dot on Save when you have not kept a copy for a day.',
        'Settings: number format, reduce motion, confirm before rebirth, start over.',
        'One tab at a time, so two open tabs never overwrite each other.'
      ]]
    ] }
];

const ABOUT = {
  lead: 'An incremental game about calling a land back from nothing. This is a playtest: it ends where the first enemies appear, and the next update brings them.',
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
  privacyCounts: 'It also sends a few anonymous counts when a game reaches certain points (such as the first rebirth), with nothing that identifies you or your browser, so we can see how far players get. You can turn this off in Settings.'
};
