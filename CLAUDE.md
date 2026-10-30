# Working on flicker (A Glimmer in the Dark)

Notes for Claude sessions. The owner (Justin) designs; Claude builds. The owner is non-technical: explain in plain language, tied to what the player sees.

## Where the game stands (2026-10-30)

- **0.1.0 is released** (changelog date October 30, 2026; internal build v1t). It is the rebirth game: the old rebirth branch (`rebirth-rethink`, builds v1s-r1 to v1s-r1q) became `main` on 2026-10-30. Dial set R1 is the game's only dial set (`MC.applySet('R1')` in `src/ui/05-map-phase.js`); the V3 set still exists in `src/rules/light-core.js` for old labs.
- **The demo, phase 1:** prologue → village → the map. Five scripted rebirths at 35, 60, 85, 110 and 130 places in one run; each brings a packet of free gifts (`D.rb.packets`, texts in `GIFT_TEXT` in `src/ui/08-rebirth-perks.js`). Heartstones buy power gifts only (the perk screen). The fifth rebirth resets nothing: the self is "whole", then "Something has seen your light" (the demo's end: Discord link). After whole, play goes on without resets: memory grows as new land comes back, and two research cards (1,500 ideas each) open Light Attunement (internal id `mastery`: tiers at 100, 1,000 and 10,000 clears, +2% to light reaching new land a tier) and the mysterious traveler (internal id `merch`/`traveler`: comes every two days, sells the perk screen's gifts for heartstones).
- **Next: combat (phase 2) and other systems on top of this.** Combat opens after whole, at about 130 places (it was labbed at 112 on the old reset model). Before building it: rerun the combat handover and phase 2 targets from 130 in the lab, and redo phase 2's budget for a game with no resets after whole (Light alone gains about 114 places in 20 days after whole; attunement adds about half again). See the bible's Next up and the Plan: verb layers > Layer 2: combat tabs.
- **Older combat work:** the game repository's branch `combat-test` (combat rules in `src/rules/combat-core.js` and `combat-map.js`, built on the old v1s main with scatter rules) and the lab's `main` (Flicker Lab v1.6, combat spine on bounded bloodstones). Both predate the rebirth game; bring their pieces onto `main` deliberately, never by merging the old branch.

## Where things live

- **Design bible:** the Claude Doc "Incremental Game Design Bible" (https://claude.ai/artifact/JvNJtpzq2CBdSPXUGuqmoV). Current state: Next up, Open decisions, Polish and public playtest plan, prototype notes; History: the decision log (newest first, a row every version). The rebirth game's design and labs: tab Plan: prestige > Rebirth branch r1. Read Current state at the start of a session. Update it every version.
- **This repository (public):** the game, its rules and the tests. `src/rules/` is the only source of rules.
- **gdjustin/flicker-lab (private):** balance labs, lab results, map scripts, later-phase design. Labs load rules from this repository (sibling folder `../flicker`, or `FLICKER_GAME`); they never keep copies. The rebirth labs (`tools/run-rebirth.js`, `tools/batch-rebirth.js`, results 2026-10-18 to 2026-10-26) are on the lab's branch `rebirth-rethink`; the lab's `main` holds the older combat lab (v1.6). The two have unrelated histories: combine them by hand when combat work starts.
- **Two builds:** `node tools/build.js` makes the test build (playtest tools, bot hooks, text editor, save key `flicker-map1-branch-v1`) and the public build (none of those, save key `flicker-v0`). Test-only code is marked: `"test": true` parts in `src/parts.json`, `<!--@test-->...<!--@/test-->` in HTML, `/*@if-test*/.../*@end-test*/` in JS. Version, title and links (Discord, source; the Google Form is still empty) live in `src/config.js`; the changelog and About text in `src/text/changelog.js`.
- **The playtest link (the owner's, test build):** the Claude artifact "A Glimmer in the Dark: playtest build" (https://claude.ai/code/artifact/8cdc7b55-0a05-48ca-93d8-e285ae774514). Publish `dist/game.html` to it (the artifact host adds the outer page shell itself).
- **The public preview link:** publish `dist/public.html` to the artifact "A Glimmer in the Dark" (https://claude.ai/artifact/RfnQHE9jD8vbeDqZnbjpM8). Both artifacts declare the `downloads` capability (the save tools need it); keep it when republishing.
- **The rebirth branch link (retired 2026-10-30):** "A Glimmer in the Dark: rebirth branch" (https://claude.ai/artifact/Q5PkvSkxDanzZSKnrXamMg) holds v1s-r1q and the owner's own playthrough save. Don't publish there any more. To carry a save over, the owner downloads it there (Save) and loads it on the playtest link.
- **GitHub Pages:** `dist/index.html` and `dist/test/index.html` are the standalone pages (workflow `pages`, started by hand in Actions; needs Settings > Pages > Source: GitHub Actions once). Only a real web address sends the anonymous counts, so Pages is where they come from.

## How the code is laid out

- `src/rules/village-core.js` (VC): the prologue's and village's rules, cards (`CARDS`), ladders (`LADDERS`), jobs, projects.
- `src/rules/light-core.js` (MCORE → MC): the map phase: dials `D` and dial sets (R1), map research `CARDS`, map lines `ML`/`MLAD`, projects, perks (`D.perks`), rebirths (`D.rb`), attunement (`D.mastery`), the traveler, the tick.
- `src/data/map-a-v4.json`: Map A (regions, places, names, darkness).
- `src/bots/`: the village bot (VBOT) and the map bot (MBOT, presets checkin, keen, light). Test build only; the labs use them too.
- `src/ui/*.js`: one script, in file order. Player text: `MT` in `05-map-phase.js` (map moments and journal lines), `UI_DEFS` in `src/text/game-text.js` (`tx(key)`), gift texts and the perk screen in `08-rebirth-perks.js`, the map's settlement drawer in `06`, the map view and place cards in `07`, milestones and run records in `11`, the site (settings, save tools, counts) in `12s`.
- Saves: `src/ui/01-state-saves.js` (`SAVE_VERSION`, `MIGRATIONS`). Old v1s saves (scatter rules) are fixed up on load by `rbFixup` in `08-rebirth-perks.js`: comforts bought with heartstones are refunded (they are gifts now), a run past its milestone gets the rebirth moment, run 6 or later becomes whole. Checked 2026-10-30 with saves made by v1s's own bots (village, run 1 at 40 places, run 2, run 7).
- **Anonymous counts:** five points (prologue, village, map, first rebirth, end = whole), once per game, to the owner's Google Sheet (`tools/counter/Code.gs`, URL in `GAME.countUrl`). Public build only, only from a real web address (not claude.ai), only if the setting allows. Milestones are kept in the save (v1t), so each is sent once.
- Test hooks (test build with `?bot`): `window.__T` (skipToMap, botMap, botToRebirth, botToWhole, openPerks, mCard, x(src) evaluates inside the page). A screenshot helper pattern: Playwright loads `dist/test/index.html?bot`, drives `__T`, screenshots.
- A gotcha that has bitten twice: a `//` comment placed in the middle of a long line swallows the rest of that line. Put comments on their own line.

## Each version

1. If balance is touched, lab it first (in flicker-lab), and follow the bot rule: before reading any bot result, check every system and ladder was engaged (coverage) and probe all-in strategies (count perk picks, and fire-tending at its fully buffed burner count); one strategy beating another by up to about ×2 is fine, more is a runaway.
2. Build: `node tools/build.js`. Test: `node tests/run.js` (all checks must pass; update `tests/golden.json` with `--update` only for an intended change, and say why in the commit).
3. Commit with the version in the message (for example `v1u: ...`), with the attribution lines. Pushing git tags is blocked from Claude sessions, so the commit message is the version marker. Bump `GAME.internal` in `src/config.js`; bump `GAME.version` and add a changelog entry only for a public release.
4. Publish `dist/game.html` to the playtest link and `dist/public.html` to the public preview, then update the bible (a History row, the prototype note, Open decisions, Next up). A headless Chromium is in the workspace (Playwright) for screen checks; use bot-made saves only.

## Rules from the owner

- Labels for ideas: Decided, Leaning, Considering. Push back when the owner seems wrong. Never give a lab readout without its cause.
- The fiction: players see a land being called back, never a game board. No "tile", "map tile", "grid" or "steps" in player text; use places, lands, the land, your home. Prestige is "rebirth" in the game.
- Player text follows the rules: when the owner's copy and the rules disagree (a number, a promise), the text says what the game does, and Claude flags it. No undocumented or unexplained rule changes between phases.
- Never manipulate the owner's save to diagnose anything; use saves the bots make.
- Save compatibility from 0.1.0 on (public since 2026-10-30): every version loads every older public save (migrations in `src/ui/01-state-saves.js`).
- Decided (owner, 2026-10-26): no retune of phase 1; assume a highly motivated, engaged player finishes it in 7 to 8 days of active play.
