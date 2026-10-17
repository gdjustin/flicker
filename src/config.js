/* ---------- The build: version, links and switches ----------
   tools/build.js makes two pages from the same source: the public build (GAME.test false: no playtest tools,
   bot hooks or text editor) and the test build (GAME.test true: all of them, and its own save). */
const GAME = {
  title: 'Flicker',              // working title, until the owner picks the new name
  version: '0.1.0',              // the public number players see
  internal: 'v1s',               // the internal build name: in the changelog and the test footer
  test: /*@test*/true,
  links: {
    feedback: '',                // the Google Form (owner sets it up); empty hides the footer link in the public build
    discord: '',                 // the Discord invite (owner sets it up)
    source: 'https://github.com/gdjustin/flicker'
  },
  // anonymous milestone counts: an address such as https://<code>.goatcounter.com/count?p={p}&e=true.
  // Empty sends nothing. The test build never sends.
  countUrl: ''
};
