// ---- Atlas parser core (identical logic to the Apps Script version) ----
// Pure JS, no Node/GAS-only APIs, so it runs in both.

const MONTHS = {January:1,Jan:1,February:2,Feb:2,March:3,Mar:3,April:4,Apr:4,
  May:5,June:6,Jun:6,July:7,Jul:7,August:8,Aug:8,September:9,Sep:9,Sept:9,
  October:10,Oct:10,November:11,Nov:11,December:12,Dec:12};

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&mdash;|&#8212;/gi, '-')
    .replace(/&ndash;|&#8211;/gi, '-')
    .replace(/&amp;/gi, '&')
    .replace(/[–—]/g, '-')   // en/em dash -> hyphen
    .replace(/[ \t\r\n]+/g, ' ');
}

// Date helpers using UTC to avoid TZ drift.
function mkDate(y, m, d) { return new Date(Date.UTC(y, m - 1, d)); }
function addDays(dt, n) { return new Date(dt.getTime() + n * 86400000); }
function fmt(dt) { // M/D/YY  (matches sheet)
  return (dt.getUTCMonth()+1) + '/' + dt.getUTCDate() + '/' + String(dt.getUTCFullYear()).slice(2);
}

// Extract schedule date ranges in document order.
// Handles "September 10 - 13, 2026" and cross-month "November 30 - December 4, 2026".
function extractRanges(text) {
  const ranges = [];
  const re = /([A-Z][a-z]{2,8})\.?\s+(\d{1,2})\s*-\s*(?:([A-Z][a-z]{2,8})\.?\s+)?(\d{1,2}),?\s+(\d{4})/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const m1 = MONTHS[m[1]];
    const em = m[3] ? MONTHS[m[3]] : m1;
    if (!m1 || !em) continue;              // not a real month token
    const d1 = parseInt(m[2], 10), d2 = parseInt(m[4], 10);
    const yEnd = parseInt(m[5], 10);
    // year on the token is the END year; if range crosses Dec->Jan, start year is prior
    const yStart = (em < m1) ? yEnd - 1 : yEnd;
    ranges.push({ start: mkDate(yStart, m1, d1), end: mkDate(yEnd, em, d2) });
  }
  return ranges;
}

// slug like "austin-atx21" / "lasvegas-las16" -> {code:"ATX 21", city:"ATX"|"LV"} or null
function parseSlug(slug) {
  const m = slug.match(/^(austin|lasvegas)-([a-z]+)(\d+)$/);
  if (!m) return null;
  const city = m[1] === 'austin' ? 'ATX' : 'LV';
  const code = m[2].toUpperCase() + ' ' + m[3];   // "atx21" -> "ATX 21"
  return { code, city };
}

const DESC = 'See additional trainings at https://www.atlasproject.org/upcoming-trainings';
const LV_LOC = 'Atlas Las Vegas Training Center 9145 W Russell Road, Las Vegas, NV 89148';
const TZ = 'America/Chicago';

// Support-night pattern (constant across cities), relative to Breakthrough start.
const SUPPORT = [
  { name: 'Feedback', offset: 0, st: '18:30', et: '23:59' },
  { name: 'Lifeboat', offset: 1, st: '18:30', et: '23:59' },
  { name: 'Contract', offset: 2, st: '22:00', et: '23:59' },
  { name: 'Cradle',   offset: 3, st: '17:30', et: '23:59' },
];

// A full row is columns A..O: [Delete,Update,Title,Start,End,StartT,EndT,Repeat,Interval,Count,Until,ByDay,Description,Location,Timezone]
function row(title, start, end, st, et, loc) {
  return ['FALSE','FALSE', title, start, end, st||'', et||'', '','','','','', DESC, loc||'', TZ];
}

function buildCohortRows(code, city, ranges) {
  const loc = city === 'LV' ? LV_LOC : '';   // Austin left blank, matching existing sheet rows
  const [explore, breakthrough, r1, r2, r3] = ranges;
  const rows = [];
  rows.push(row(code + ': Explore',      fmt(explore.start),      fmt(addDays(explore.end,1)),      '', '', loc));
  rows.push(row(code + ': Breakthrough', fmt(breakthrough.start), fmt(addDays(breakthrough.end,1)), '', '', loc));
  [r1, r2, r3].forEach((r, i) => {
    rows.push(row(code + ': RD ' + (i+1) + 'W', fmt(r.start), fmt(addDays(r.end,1)), '', '', loc));
  });
  SUPPORT.forEach(s => {
    const d = addDays(breakthrough.start, s.offset);
    rows.push(row(code + ' Support: ' + s.name, fmt(d), fmt(d), s.st, s.et, loc));
  });
  return rows;
}

module.exports = { stripHtml, extractRanges, parseSlug, buildCohortRows, fmt, addDays, DESC, LV_LOC };
