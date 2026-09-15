/**
 * Atlas Project → Training Calendar — weekly auto-updater (zero-touch)
 * -------------------------------------------------------------------
 * Scrapes https://www.atlasproject.org/upcoming-trainings, reads each training's
 * detail page, appends any NEW cohorts/workshops to the sheet, AND creates the
 * matching Google Calendar events directly on the "Atlas Trainings" calendar —
 * writing each Event ID back into the sheet. No Sheet2Cal export needed.
 *
 * One cohort => 9 rows / 9 events:
 *   Explore, Breakthrough, RD 1W, RD 2W, RD 3W (all-day),
 *   Support: Feedback / Lifeboat / Contract / Cradle (timed, keyed to Breakthrough).
 * One workshop (e.g. Relationships) => 1 row / 1 event.
 *
 * SAFETY MODEL:
 *   - Never edits or deletes existing rows/events. Append + create-if-missing only.
 *   - Sheet dedupes on (Title + Start date); events are created only for rows whose
 *     Event ID cell is empty — so each event is created exactly once, ever.
 *   - Only appends a cohort when ALL 5 date ranges parse; incomplete pages are reported.
 *   - DRY_RUN=true: logs/emails what it WOULD do, writes nothing and creates no events.
 *
 * SETUP: set CALENDAR_ID below, set the Apps Script project time zone to America/Chicago
 *        (Project Settings ⚙), run `atlasUpdate` once (authorize), verify the dry-run log,
 *        flip DRY_RUN to false, run once, then run `installWeeklyTrigger` once.
 *        IMPORTANT: once this owns event creation, stop running the Sheet2Cal export
 *        for these rows (otherwise events would be created twice).
 */

// ============================== CONFIG ==============================
const CONFIG = {
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID',
  TAB_NAME: '',                 // '' = first sheet. Set to the exact tab name if not first.
  CALENDAR_ID: 'YOUR_CALENDAR_ID@group.calendar.google.com', // "Atlas Trainings"
  CREATE_EVENTS: true,         // true = create Google Calendar events directly. false = just fill the sheet.
  DRY_RUN: true,               // true = log/email only, no writes/events. Flip to false to go live.
  EMAIL_SUMMARY_TO: 'you@example.com',  // '' to disable the summary email
  BASE: 'https://www.atlasproject.org',
  SUMMARY_URL: 'https://www.atlasproject.org/upcoming-trainings',
};

const DESC = 'See additional trainings at https://www.atlasproject.org/upcoming-trainings';
const LV_LOC = 'Atlas Las Vegas Training Center 9145 W Russell Road, Las Vegas, NV 89148';
const TZ = 'America/Chicago';

// Support nights — identical in every city, keyed off the Breakthrough START date.
const SUPPORT = [
  { name: 'Feedback', offset: 0, st: '18:30', et: '23:59' },
  { name: 'Lifeboat', offset: 1, st: '18:30', et: '23:59' },
  { name: 'Contract', offset: 2, st: '22:00', et: '23:59' },
  { name: 'Cradle',   offset: 3, st: '17:30', et: '23:59' },
];

const MONTHS = { January:1,Jan:1,February:2,Feb:2,March:3,Mar:3,April:4,Apr:4,
  May:5,June:6,Jun:6,July:7,Jul:7,August:8,Aug:8,September:9,Sep:9,Sept:9,
  October:10,Oct:10,November:11,Nov:11,December:12,Dec:12 };

// ============================== ENTRY POINTS ==============================

/** Main job. Safe to run manually or on a trigger. */
function atlasUpdate() {
  const sheet = getSheet_();
  const headerRow = detectHeaderRow_(sheet);          // finds the "Title" row (layout-independent)

  const existing = readExistingKeys_(sheet, headerRow);   // Set of "title||M/D/YYYY"
  const slugs = discoverSlugs_(fetch_(CONFIG.SUMMARY_URL));

  const toAppend = [];
  const report = { added: [], skippedExisting: [], incomplete: [], noDate: [], errors: [] };

  slugs.forEach(function (slug) {
    try {
      const isCore = /^(austin|lasvegas)-/.test(slug);
      const html = fetch_(CONFIG.BASE + '/upcoming-trainings-details/' + slug);
      const text = stripHtml_(html);
      const ranges = extractRanges_(text);

      if (isCore) {
        const info = parseSlug_(slug);
        if (!info) return;
        if (ranges.length < 5) {                       // detail page missing Redesign dates
          if (!cohortAlreadyPresent_(existing, info.code)) {
            report.incomplete.push(info.code + ' (found ' + ranges.length + '/5 date ranges — needs manual Redesign entry)');
          }
          return;
        }
        const rows = buildCohortRows_(info.code, info.city, ranges.slice(0, 5), parseVenues_(text));
        pushNew_(rows, existing, toAppend, report, info.code);
      } else {
        // Workshop (relationships, mastery, warriors-council, grace, ...)
        if (ranges.length < 1) { report.noDate.push(prettyName_(slug) + ' (listed, no date yet — TBD)'); return; }
        const row = buildWorkshopRow_(slug, text, ranges[0]);
        pushNew_([row], existing, toAppend, report, prettyName_(slug));
      }
    } catch (e) {
      report.errors.push(slug + ': ' + e);
    }
  });

  if (toAppend.length && !CONFIG.DRY_RUN) {
    const start = lastTitleRow_(sheet, headerRow) + 1;   // next row after the last real Title, not after stray checkboxes
    sheet.getRange(start, 1, toAppend.length, 15).setValues(toAppend);
  }

  // Create calendar events for any row that has a Title but no Event ID yet
  // (covers the rows just appended AND any earlier unsynced ones). Idempotent.
  report.events = (CONFIG.CREATE_EVENTS) ? createMissingEvents_(sheet, headerRow) : { created: 0, wouldCreate: 0, linked: 0, errors: [] };

  const summary = buildSummary_(report, toAppend.length);
  Logger.log(summary);
  console.log(summary);   // shows in the execution log regardless of email
  if (CONFIG.EMAIL_SUMMARY_TO) {
    MailApp.sendEmail(CONFIG.EMAIL_SUMMARY_TO,
      '[Atlas calendar] ' + (CONFIG.DRY_RUN ? 'DRY RUN — ' : '') + toAppend.length + ' new row(s), ' +
        (report.events.created || report.events.wouldCreate || 0) + ' event(s)',
      summary);
  }
  return summary;
}

/** Run ONCE to schedule atlasUpdate every week (Mondays ~7am). Replaces any prior trigger. */
function installWeeklyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'atlasUpdate') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('atlasUpdate').timeBased().everyWeeks(1).onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).create();
  Logger.log('Weekly trigger installed: atlasUpdate, Mondays @ 7am.');
}

// ============================== SCRAPE + PARSE ==============================

function fetch_(url) {
  const res = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36' },
  });
  if (res.getResponseCode() >= 400) throw new Error('HTTP ' + res.getResponseCode() + ' for ' + url);
  return res.getContentText();
}

function discoverSlugs_(summaryHtml) {
  const re = /upcoming-trainings-details\/([a-z0-9-]+)/g;
  const seen = {}, out = [];
  let m;
  while ((m = re.exec(summaryHtml)) !== null) {
    if (!seen[m[1]]) { seen[m[1]] = true; out.push(m[1]); }
  }
  return out;
}

function stripHtml_(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&mdash;|&#8212;|&ndash;|&#8211;/gi, '-')
    .replace(/&amp;/gi, '&')
    .replace(/[–—]/g, '-')
    .replace(/[ \t\r\n]+/g, ' ');
}

// Ordered schedule ranges. Handles "Sep 10 - 13, 2026" and cross-month "July 30 - August 2, 2026".
function extractRanges_(text) {
  const ranges = [];
  const re = /([A-Z][a-z]{2,8})\.?\s+(\d{1,2})\s*-\s*(?:([A-Z][a-z]{2,8})\.?\s+)?(\d{1,2}),?\s+(\d{4})/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const m1 = MONTHS[m[1]];
    if (!m1) continue;
    const em = m[3] ? MONTHS[m[3]] : m1;
    if (!em) continue;
    const d1 = parseInt(m[2], 10), d2 = parseInt(m[4], 10), yEnd = parseInt(m[5], 10);
    const yStart = (em < m1) ? yEnd - 1 : yEnd;          // Dec->Jan wrap
    ranges.push({ start: dateAtNoon_(yStart, m1, d1), end: dateAtNoon_(yEnd, em, d2) });
  }
  return ranges;
}

function parseSlug_(slug) {
  const m = slug.match(/^(austin|lasvegas)-([a-z]+)(\d+)$/);
  if (!m) return null;
  return { city: m[1] === 'austin' ? 'ATX' : 'LV', code: m[2].toUpperCase() + ' ' + m[3] };
}

function prettyName_(slug) {
  return slug.split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
}

// ============================== ROW BUILDERS ==============================
// Row = columns A..O:
// [Delete, Update, Title, Start, End, StartTime, EndTime, Repeat, Interval, Count, Until, ByDay, Description, Location, Timezone]

function row_(title, start, end, st, et, loc) {
  // Update = false: the script creates the calendar event itself, so Sheet2Cal
  // should not also pick the row up (Event ID gets filled in the same run).
  return [false, false, title, start, end, st || '', et || '', '', '', '', '', '', DESC, loc || '', TZ];
}

// Per-phase Austin venues ("{venue+address} | Training Room: {room}") from detail text.
// Vegas is a single venue everywhere, so venues are only used for Austin.
function parseVenues_(text) {
  function seg(label, next) {
    var i = text.indexOf(label); if (i < 0) return '';
    var j = text.length;
    next.forEach(function (n) { var k = text.indexOf(n, i + label.length); if (k >= 0 && k < j) j = k; });
    return text.slice(i + label.length, j);
  }
  function venue(section) {
    var s = section.replace(/^[^A-Za-z]*[A-Z][a-z]{2,8}\.?\s+\d{1,2}\s*-\s*(?:[A-Z][a-z]{2,8}\.?\s+)?\d{1,2},?\s+\d{4}/, '').trim();
    var m = s.match(/^(.*?)\s*Training Room:\s*(.*)$/);
    var out = m ? (m[1].replace(/\s+/g, ' ').trim().replace(/\s*,\s*/g, ', ') + ' | Training Room: ' + m[2].replace(/\s+/g, ' ').trim())
                : s.replace(/\s+/g, ' ').trim();
    return (out.length > 200 || !/[A-Za-z]/.test(out)) ? '' : out;   // sanity clamp
  }
  return { explore: venue(seg('Explore:', ['Breakthrough:'])),
           breakthrough: venue(seg('Breakthrough:', ['Redesign:', 'Program Cost'])) };
}

function buildCohortRows_(code, city, ranges, venues) {
  venues = venues || {};
  const isLV = city === 'LV';
  const vExplore  = isLV ? LV_LOC : (venues.explore || '');
  const vBreak    = isLV ? LV_LOC : (venues.breakthrough || '');
  const vRedesign = isLV ? LV_LOC : '';                           // Austin Redesign: no venue on site
  const vSupport  = isLV ? LV_LOC : (venues.breakthrough || '');  // Support runs during Breakthrough
  const explore = ranges[0], bt = ranges[1];
  const rows = [];
  rows.push(row_(code + ': Explore',      explore.start, addDays_(explore.end, 1), '', '', vExplore));
  rows.push(row_(code + ': Breakthrough', bt.start,      addDays_(bt.end, 1),      '', '', vBreak));
  for (var i = 2; i <= 4; i++) {
    rows.push(row_(code + ': RD ' + (i - 1) + 'W', ranges[i].start, addDays_(ranges[i].end, 1), '', '', vRedesign));
  }
  SUPPORT.forEach(function (s) {
    const d = addDays_(bt.start, s.offset);
    rows.push(row_(code + ' Support: ' + s.name, d, d, s.st, s.et, vSupport));
  });
  return rows;
}

function buildWorkshopRow_(slug, text, range) {
  var city = /Las Vegas/i.test(text) ? 'Las Vegas' : (/Austin/i.test(text) ? 'Austin' : '');
  var title = prettyName_(slug) + (city ? ' (' + city + ')' : '');
  return row_(title, range.start, addDays_(range.end, 1), '', '', '');
}

// ============================== SHEET I/O + DEDUPE ==============================

function getSheet_() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  return CONFIG.TAB_NAME ? ss.getSheetByName(CONFIG.TAB_NAME) : ss.getSheets()[0];
}

// Find the row whose column C says "Title" (handles any number of blank/leading rows).
function detectHeaderRow_(sheet) {
  const scan = Math.min(15, sheet.getLastRow());
  if (scan < 1) throw new Error('Sheet "' + sheet.getName() + '" appears empty.');
  const colC = sheet.getRange(1, 3, scan, 1).getValues();
  for (var i = 0; i < colC.length; i++) {
    if (String(colC[i][0]).trim().toLowerCase() === 'title') return i + 1;
  }
  throw new Error('No "Title" header found in column C of the first ' + scan +
    ' rows of tab "' + sheet.getName() + '". Set TAB_NAME to the correct tab.');
}

// Create a Google Calendar event for every data row that has a Title but no Event ID
// yet, then write the Event ID back into column Q. Idempotent: a row with an Event ID
// is never touched again, so events are created exactly once. Honors DRY_RUN.
// Rows with a Start Time are timed events; rows without are multi-day all-day events
// (End is exclusive — matching the sheet's convention).
function createMissingEvents_(sheet, headerRow) {
  const out = { created: 0, wouldCreate: 0, linked: 0, errors: [] };
  const last = lastTitleRow_(sheet, headerRow);
  if (last <= headerRow) return out;

  const cal = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  if (!cal) { out.errors.push('Calendar not found / no access: ' + CONFIG.CALENDAR_ID); return out; }

  const n = last - headerRow;
  const data = sheet.getRange(headerRow + 1, 3, n, 15).getValues();   // C..Q
  // index within row: C=0 D=1 E=2 F=3 G=4 ... M=10 N=11 O=12 P=13 Q=14
  const qcol = sheet.getRange(headerRow + 1, 17, n, 1).getValues();   // Q, written back
  let dirty = false;

  for (var i = 0; i < n; i++) {
    const title = String(data[i][0]).trim();
    const eventId = String(data[i][14]).trim();
    if (!title || eventId) continue;                 // no title, or already has an event

    const start = data[i][1], end = data[i][2];
    if (!(start instanceof Date)) { out.errors.push(title + ': bad start date'); continue; }
    const startT = String(data[i][3]).trim();        // F
    const endT   = String(data[i][4]).trim();        // G
    const desc   = String(data[i][10] || '');        // M
    const loc    = String(data[i][11] || '');        // N

    // Dedupe guard: if an event with this exact title already exists on this day
    // (e.g. from an earlier manual Sheet2Cal export), link to it instead of creating
    // a duplicate — and backfill its Event ID so future runs skip it instantly.
    try {
      const existing = findExistingEvent_(cal, title, start);
      if (existing) {
        if (!CONFIG.DRY_RUN) { qcol[i][0] = existing.getId(); dirty = true; }
        out.linked++;
        continue;
      }
    } catch (e0) { out.errors.push(title + ' (lookup): ' + e0); continue; }

    if (CONFIG.DRY_RUN) { out.wouldCreate++; continue; }

    try {
      var ev;
      if (startT) {                                  // timed event (Support nights)
        var s = atTime_(start, startT), e = atTime_(start, endT || startT);
        ev = cal.createEvent(title, s, e, { location: loc, description: desc });
      } else {                                       // all-day, multi-day (End exclusive)
        ev = cal.createAllDayEvent(title, dayOnly_(start), dayOnly_(end), { location: loc, description: desc });
      }
      qcol[i][0] = ev.getId();
      dirty = true;
      out.created++;
    } catch (e2) {
      out.errors.push(title + ': ' + e2);
    }
  }

  if (dirty) sheet.getRange(headerRow + 1, 17, n, 1).setValues(qcol);   // persist Event IDs
  return out;
}

// Existing calendar event with this exact title on the row's start day, or null.
// getEventsForDay returns multi-day all-day events that overlap the day too.
function findExistingEvent_(cal, title, startDate) {
  const evs = cal.getEventsForDay(dayOnly_(startDate));
  for (var i = 0; i < evs.length; i++) {
    if (String(evs[i].getTitle()).trim() === title) return evs[i];
  }
  return null;
}

function dayOnly_(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function atTime_(d, hhmm) {
  const m = String(hhmm).match(/(\d{1,2}):(\d{2})/);
  const h = m ? parseInt(m[1], 10) : 0, mi = m ? parseInt(m[2], 10) : 0;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, mi, 0);
}

// Last row with a non-empty Title (column C). Ignores the checkbox columns that
// run far down the sheet, so appends land right after the real data.
function lastTitleRow_(sheet, headerRow) {
  const last = sheet.getLastRow();
  if (last <= headerRow) return headerRow;
  const titles = sheet.getRange(headerRow + 1, 3, last - headerRow, 1).getValues();
  for (var i = titles.length - 1; i >= 0; i--) {
    if (String(titles[i][0]).trim() !== '') return headerRow + 1 + i;
  }
  return headerRow;
}

function readExistingKeys_(sheet, headerRow) {
  const last = sheet.getLastRow();
  const first = headerRow + 1;
  const set = {};
  if (last < first) return set;
  const vals = sheet.getRange(first, 3, last - first + 1, 2).getValues();  // C (Title), D (Start)
  vals.forEach(function (r) {
    const title = String(r[0]).trim();
    if (!title) return;
    set[title + '||' + keyDate_(r[1])] = true;
  });
  return set;
}

function pushNew_(rows, existing, toAppend, report, label) {
  var addedAny = false, allDup = true;
  rows.forEach(function (r) {
    const key = String(r[2]).trim() + '||' + keyDate_(r[3]);
    if (existing[key]) return;
    existing[key] = true;
    toAppend.push(r);
    addedAny = true; allDup = false;
  });
  if (addedAny) report.added.push(label + ' (' + rows.length + ' rows)');
  else if (allDup) report.skippedExisting.push(label);
}

function cohortAlreadyPresent_(existing, code) {
  for (var key in existing) { if (key.indexOf(code + ':') === 0 || key.indexOf(code + ' Support:') === 0) return true; }
  return false;
}

// ============================== DATE UTILS ==============================
// Noon-local dates avoid any midnight/DST day-rollover when written to the sheet.
function dateAtNoon_(y, m, d) { return new Date(y, m - 1, d, 12, 0, 0); }
function addDays_(dt, n) { return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + n, 12, 0, 0); }
function keyDate_(v) {
  if (v instanceof Date) return (v.getMonth() + 1) + '/' + v.getDate() + '/' + v.getFullYear();
  var s = String(v).trim();
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) { var y = m[3].length === 2 ? '20' + m[3] : m[3]; return m[1] + '/' + m[2] + '/' + y; }
  return s;
}

// ============================== REPORT ==============================
function buildSummary_(report, appended) {
  var L = [];
  L.push('Atlas calendar update — ' + (CONFIG.DRY_RUN ? 'DRY RUN (nothing written)' : 'LIVE'));
  L.push('New rows ' + (CONFIG.DRY_RUN ? 'to add' : 'appended') + ': ' + appended);
  if (report.events) {
    const ev = report.events;
    L.push('Calendar events ' + (CONFIG.DRY_RUN ? 'to create' : 'created') + ': ' + (CONFIG.DRY_RUN ? ev.wouldCreate : ev.created));
    if (ev.linked) L.push('  already on calendar, linked (no duplicate): ' + ev.linked);
    if (ev.errors && ev.errors.length) L.push('  event errors:\n    - ' + ev.errors.join('\n    - '));
  }
  L.push('');
  if (report.added.length)          L.push('ADDED:\n  - ' + report.added.join('\n  - '));
  if (report.incomplete.length)     L.push('\nNEEDS MANUAL ENTRY (site missing dates):\n  - ' + report.incomplete.join('\n  - '));
  if (report.noDate.length)         L.push('\nTBD (no date on site yet):\n  - ' + report.noDate.join('\n  - '));
  if (report.skippedExisting.length) L.push('\nAlready in sheet (skipped): ' + report.skippedExisting.join(', '));
  if (report.errors.length)         L.push('\nERRORS:\n  - ' + report.errors.join('\n  - '));
  return L.join('\n');
}
