# Working on flicker

Notes for Claude sessions. The owner (Justin) designs; Claude builds. The owner is non-technical: explain in plain language, tied to what the player sees.

## Where things live

- **Design bible:** the Claude Doc "Incremental Game Design Bible" (Current state: Next up, Open decisions, Polish and public playtest plan; History: the decision log). Read Current state at the start of a session. Update it every version: prototype notes, a History row, Open decisions, Next up.
- **This repository (public):** the game, its rules and the tests. `src/rules/` is the only source of rules.
- **gdjustin/flicker-lab (private):** balance labs, lab results, map scripts, later-phase design. Labs load rules from this repository; they never keep copies.
- **The playtest link:** the Claude artifact "A flicker in the dark: map phase 1" (https://claude.ai/code/artifact/8cdc7b55-0a05-48ca-93d8-e285ae774514). Publish `dist/game.html` to it (the artifact host adds the outer page shell itself; `dist/index.html` is the standalone page for GitHub Pages).

## Each version

1. If balance is touched, lab it first (in flicker-lab), and follow the bot rule: before reading any bot result, check every system and ladder was engaged (coverage) and probe all-in strategies; one strategy beating another by up to about ×2 is fine, more is a runaway.
2. Build: `node tools/build.js`. Test: `node tests/run.js` (all checks must pass; update `tests/golden.json` with `--update` only for an intended change, and say why in the commit).
3. Commit with the version in the message (for example `v1r: ...`). Pushing git tags is blocked from Claude sessions, so the commit message is the version marker.
4. Publish `dist/game.html` to the playtest link, then update the bible.

## Rules from the owner

- Labels for ideas: Decided, Leaning, Considering. Push back when the owner seems wrong. Never give a lab readout without its cause.
- The fiction: players see a land being called back, never a game board. No "tile", "map tile", "grid" or "steps" in player text; use places, the land, your home. Prestige is "rebirth" in the game.
- Never manipulate the owner's save to diagnose anything; use saves the bots make.
- Save compatibility from the public playtest on: every version loads every older public save (migrations in `src/ui/01-state-saves.js`).
