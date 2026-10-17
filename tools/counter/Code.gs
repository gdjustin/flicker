/**
 * Flicker's milestone counter: a Google Apps Script web app that writes one row to this spreadsheet each time
 * a game reaches a milestone, and keeps a Summary tab of counts and times.
 *
 * What arrives (nothing identifies a player): the milestone, hours played, days since the game began,
 * the run number and the game's version. The time of arrival is added here.
 *
 * Setup (once): Extensions > Apps Script, paste this file over Code.gs, save, choose "setup" in the toolbar and Run
 * (allow it), then Deploy > New deployment > Web app; Execute as: Me; Who has access: Anyone. Copy the web app URL.
 */
var MILESTONES = [
  ['prologue', 'Loaded the prologue'],
  ['village', 'Reached the village'],
  ['map', 'Reached the map'],
  ['rebirth1', 'First rebirth'],
  ['end', 'Reached the end of the playtest']
];

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rows = ss.getSheetByName('Rows') || ss.insertSheet('Rows');
  if (rows.getLastRow() === 0) rows.appendRow(['Received', 'Milestone', 'Hours played', 'Days since start', 'Run', 'Version']);
  rows.setFrozenRows(1);
  var sum = ss.getSheetByName('Summary') || ss.insertSheet('Summary', 0);
  sum.clear();
  sum.appendRow(['Milestone', 'Players', 'Share of those who loaded', 'Average hours played', 'Middle (median) hours', 'Fastest hours', 'Average days since start']);
  MILESTONES.forEach(function (m, i) {
    var r = i + 2, k = '"' + m[0] + '"', B = 'Rows!$B$2:$B', C = 'Rows!$C$2:$C', D = 'Rows!$D$2:$D';
    sum.getRange(r, 1, 1, 7).setFormulas([[
      '="' + m[1] + '"',
      '=COUNTIF(' + B + ',' + k + ')',
      '=IF($B$2=0,"",B' + r + '/$B$2)',
      '=IFERROR(AVERAGEIF(' + B + ',' + k + ',' + C + '),"")',
      '=IFERROR(MEDIAN(FILTER(' + C + ',' + B + '=' + k + ')),"")',
      '=IFERROR(MINIFS(' + C + ',' + B + ',' + k + '),"")',
      '=IFERROR(AVERAGEIF(' + B + ',' + k + ',' + D + '),"")'
    ]]);
  });
  sum.getRange('C2:C6').setNumberFormat('0%');
  sum.getRange('D2:G6').setNumberFormat('0.0');
  sum.setFrozenRows(1); sum.autoResizeColumns(1, 7);
}

function doPost(e) { var d = {}; try { d = JSON.parse(e.postData.contents); } catch (err) {} return add_(d); }
function doGet(e) { return add_(e.parameter || {}); }

function add_(d) {
  var known = MILESTONES.map(function (m) { return m[0]; });
  var play = Number(d.play), days = Number(d.days), run = Math.floor(Number(d.run) || 1);
  // ignore anything that isn't a plausible milestone row
  if (known.indexOf(d.m) < 0 || !(play >= 0 && play < 8760) || !(days >= 0 && days < 400) || run < 1 || run > 999) return out_('ignored');
  var lock = LockService.getScriptLock(); lock.waitLock(5000);
  try { SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rows').appendRow([new Date(), d.m, Math.round(play * 100) / 100, Math.round(days * 100) / 100, run, String(d.v || '').slice(0, 16)]); }
  finally { lock.releaseLock(); }
  return out_('ok');
}
function out_(t) { return ContentService.createTextOutput(t); }
