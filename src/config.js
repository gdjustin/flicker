/* ---------- The build: version, links and switches ----------
   tools/build.js makes two pages from the same source: the public build (GAME.test false: no playtest tools,
   bot hooks or text editor) and the test build (GAME.test true: all of them, and its own save). */
const GAME = {
  title: 'A Glimmer in the Dark',   // the game's name (owner, 2026-10-18; was the working title A Flicker in the Dark)
  version: '0.1.0',              // the public number players see
  internal: 'v1s-r1f',            // the internal build name: in the changelog and the test footer (the rebirth branch, 2026-10-19)
  branch: 'rebirth',             // the rebirth branch: its own save, so it never touches the main line's
  test: /*@test*/true,
  links: {
    feedback: '',                // the Google Form (owner sets it up); empty hides the footer link in the public build
    discord: '',                 // the Discord invite (owner sets it up)
    source: 'https://github.com/gdjustin/flicker'
  },
  // anonymous milestone counts: the web app address of the owner's counter sheet (tools/counter/Code.gs),
  // like https://script.google.com/macros/s/.../exec. Empty sends nothing. The test build never sends.
  countUrl: 'https://script.google.com/macros/s/AKfycbwXUME7e8RJQ46orpkuaV3D8iGFynd_BVngLy3kLXx4kvr9kiF0BwwVk7JCAAAUswhM/exec'
};
