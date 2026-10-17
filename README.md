# flicker

A free, text-based incremental game played in the browser. You begin as almost nothing, build a village around a fading fire, and call a lost land back out of the void with light.

This is an early, in-development version. A public playtest is coming.

## Playing it locally

No installs needed beyond [Node.js](https://nodejs.org):

```
node tools/build.js      # writes dist/index.html
```

Open `dist/index.html` in a browser.

## How the code is laid out

| Folder | What's in it |
| --- | --- |
| `src/rules/` | The game's rules and numbers, with no screen code: the village core and the light core. The game, the balance labs and the tests all run these same files. |
| `src/data/` | The map (Map A v4): land, regions, names and push order. |
| `src/bots/` | Headless players that play the rules: a village bot and a check-in bot. Used by the tests, the labs and the playtest tools. |
| `src/text/` | Player-facing text. |
| `src/ui/` | The screen: rendering, input, saves, time away. These files are consecutive pieces of one script, numbered in page order. |
| `src/styles/`, `src/page/` | The stylesheet and the page's markup. |
| `src/parts.json` | The order the page is assembled in. |
| `tools/build.js` | Assembles the page. No dependencies. |
| `tests/run.js` | Headless checks run on every push: the page builds and parses, the village bot finishes the village, the check-in bot reaches 40 places, and the bots' numbers match `tests/golden.json`. |

The bots have no randomness, so the same rules always give the same numbers. A change to `tests/golden.json` is a real change in how the game plays, and is made on purpose with `node tests/run.js --update`.

## Licence

The code is released under the [MIT licence](LICENSE).

The game's writing, names, story and art are © 2026 Justin Davis, all rights reserved. The MIT licence covers the code only.
