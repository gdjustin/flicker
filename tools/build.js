#!/usr/bin/env node
// Builds the game page from src/. No dependencies.
//
//   node tools/build.js            -> dist/game.html  (bare page, for the Claude artifact, which adds its own <html> shell)
//                                     dist/index.html (standalone page, for GitHub Pages and local play)
//
// src/parts.json lists the page's pieces in order: {"file": path} or {"text": literal}.
// Inside any file, /*@include path*/null is replaced by that file's contents (used for the map data).
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const INCLUDE = /\/\*@include ([^*]+?)\*\/null/g;

function expand(text) {
  return text.replace(INCLUDE, (_, p) => read(p.trim()));
}

// The text of one source file with includes filled in (used by the tests to load rules in Node).
function loadSource(p) { return expand(read(p)); }

// The whole bare page.
function assemble() {
  const { parts } = JSON.parse(read('src/parts.json'));
  return parts.map(part => ('text' in part ? part.text : loadSource(part.file))).join('');
}

// The standalone page: the shell the artifact host would otherwise add.
function standalone(bare) {
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
    '</head><body>\n' + bare + '</body></html>\n';
}

if (require.main === module) {
  const bare = assemble();
  fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'dist/game.html'), bare);
  fs.writeFileSync(path.join(ROOT, 'dist/index.html'), standalone(bare));
  console.log('built dist/game.html and dist/index.html (' + bare.length + ' characters)');
}

module.exports = { assemble, loadSource, standalone };
