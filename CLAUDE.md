# Working on flicker (A Glimmer in the Dark)

Notes for Claude sessions. The owner (Justin) designs; Claude builds. The owner is non-technical: explain in plain language, tied to what the player sees.

## Where things live

- **Design bible:** the Claude Doc "Incremental Game Design Bible" (Current state: Next up, Open decisions, Polish and public playtest plan; History: the decision log). Read Current state at the start of a session. Update it every version: prototype notes, a History row, Open decisions, Next up.
- **This repository (public):** the game, its rules and the tests. `src/rules/` is the only source of rules.
- **gdjustin/flicker-lab (private):** balance labs, lab results, map scripts, later-phase design. Labs load rules from this repository; they never keep copies.
- **Two builds (v1s):** `node tools/build.js` makes the test build (playtest tools, bot hooks, text editor, the owner's save key) and the public build (none of those, its own save key). Test-only code is marked: `"test": true` parts in `src/parts.json`, `<!--@test-->...<!--@/test-->` in HTML, `/*@if-test*/.../*@end-test*/` in JS. Version, title (A Glimmer in the Dark, owner 2026-10-18; the repository keeps the codename flicker) and links live in `src/config.js`; the changelog and About text in `src/text/changelog.js`.
- **The playtest link (the owner's, test build):** the Claude artifact "A Glimmer in the Dark: playtest build" (formerly "A flicker in the dark: map phase 1") (https://claude.ai/code/artifact/8cdc7b55-0a05-48ca-93d8-e285ae774514). Publish `dist/game.html` to it (the artifact host adds the outer page shell itself).
- **The public preview link:** publish `dist/public.html` to the artifact "A Glimmer in the Dark" (https://claude.ai/artifact/RfnQHE9jD8vbeDqZnbjpM8, its own save). Both artifacts declare the `downloads` capability (the save tools need it); keep it when republishing. `dist/index.html` and `dist/test/index.html` are the standalone pages for GitHub Pages (workflow `pages`, started by hand).

## Each version

1. If balance is touched, lab it first (in flicker-lab), and follow the bot rule: before reading any bot result, check every system and ladder was engaged (coverage) and probe all-in strategies; one strategy beating another by up to about ×2 is fine, more is a runaway.
2. Build: `node tools/build.js`. Test: `node tests/run.js` (all checks must pass; update `tests/golden.json` with `--update` only for an intended change, and say why in the commit).
3. Commit with the version in the message (for example `v1r: ...`). Pushing git tags is blocked from Claude sessions, so the commit message is the version marker.
4. Publish `dist/game.html` to the playtest link and `dist/public.html` to the public preview, then update the bible. A headless Chromium is in the workspace (Playwright) for screen checks; use bot-made saves only.

## Rules from the owner

- Labels for ideas: Decided, Leaning, Considering. Push back when the owner seems wrong. Never give a lab readout without its cause.
- The fiction: players see a land being called back, never a game board. No "tile", "map tile", "grid" or "steps" in player text; use places, the land, your home. Prestige is "rebirth" in the game.
- Never manipulate the owner's save to diagnose anything; use saves the bots make.
- Save compatibility from the public playtest on: every version loads every older public save (migrations in `src/ui/01-state-saves.js`).
