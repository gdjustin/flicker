#!/usr/bin/env node
// Builds the game page from src/. No dependencies.
//
//   node tools/build.js   makes two builds from the same source (v1s):
//     the test build   (playtest tools, bot hooks, the text editor; the owner's save key)
//       dist/game.html        bare page for the owner's playtest link (the Claude artifact adds its own <html> shell)
//       dist/test.html        the same, titled "A Glimmer in the Dark: test build", for a separate check link
//       dist/test/index.html  standalone, for GitHub Pages at /test/
//     the public build (none of those; its own save key)
//       dist/public.html      bare page, for a public preview link
//       dist/index.html       standalone, for GitHub Pages
//     dist/version.json and dist/test/version.json: the page checks these to offer a reload when a new version is out.
//
// Marked parts: in src/parts.json, "test": true parts go in the test build only. Inside files,
// <!--@test-->...<!--@/test--> (HTML) and /*@if-test*/.../*@end-test*/ (JS) are test-only, and /*@test*/true becomes false in the public build.
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

// The whole bare page. test: true for the test build (the default), false for the public build.
function assemble(test) {
  if (test == null) test = true;
  const { parts } = JSON.parse(read('src/parts.json'));
  let page = parts.filter(part => test || !part.test).map(part => ('text' in part ? part.text : loadSource(part.file))).join('');
  if (!test) {
    page = page.replace(/<!--@test-->[\s\S]*?<!--@\/test-->/g, '').replace(/\/\*@if-test\*\/[\s\S]*?\/\*@end-test\*\//g, '').replace(/\/\*@test\*\/true/g, 'false');
    page = page.replace(/<title>[^<]*<\/title>/, '<title>' + gameField('title') + '</title>');
  }
  return page;
}
// a field of GAME in src/config.js (version, internal, title)
function gameField(k) { const m = read('src/config.js').match(new RegExp('\\b' + k + ":\\s*'([^']*)'")); return m ? m[1] : ''; }

// The standalone page: the shell the artifact host would otherwise add.
function standalone(bare) {
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
    '</head><body>\n' + bare + '</body></html>\n';
}

if (require.main === module) {
  const test = assemble(true), pub = assemble(false), out = p => path.join(ROOT, 'dist', p);
  fs.mkdirSync(out('test'), { recursive: true });
  fs.writeFileSync(out('game.html'), test);
  fs.writeFileSync(out('test.html'), test.replace(/<title>[^<]*<\/title>/, '<title>A Glimmer in the Dark: test build</title>'));
  fs.writeFileSync(out('test/index.html'), standalone(test));
  fs.writeFileSync(out('public.html'), pub);
  fs.writeFileSync(out('index.html'), standalone(pub));
  const ver = JSON.stringify({ version: gameField('version'), internal: gameField('internal'), built: new Date().toISOString() }) + '\n';
  fs.writeFileSync(out('version.json'), ver); fs.writeFileSync(out('test/version.json'), ver);
  console.log('built ' + gameField('version') + ' (' + gameField('internal') + '): test build ' + test.length + ' characters, public build ' + pub.length);
}

module.exports = { assemble, loadSource, standalone, gameField };
