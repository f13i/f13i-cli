# Atlas trainings → calendar (weekly, zero-touch)

Replaces the whole manual chore: copying the upcoming-trainings page into the sheet
*and* pushing it to the calendar. Runs inside Google (Apps Script) on a weekly
trigger — no laptop, no Sheet2Cal export click.

**What it does:** scrapes `atlasproject.org/upcoming-trainings` + each detail page,
appends any **new** cohort/workshop to the sheet, **and creates the matching Google
Calendar events directly** on the "Atlas Trainings" calendar, writing each Event ID
back into the sheet. Append + create-if-missing only; never edits or deletes existing
rows or events.

## What one cohort becomes (9 rows)

| Row | Title | Start | End | Times |
|-----|-------|-------|-----|-------|
| 1 | `{CODE}: Explore` | Explore start | +1 day | — |
| 2 | `{CODE}: Breakthrough` | Breakthrough start | +1 day | — |
| 3–5 | `{CODE}: RD 1W/2W/3W` | Redesign start | +1 day | — |
| 6 | `{CODE} Support: Feedback` | Breakthrough day | same | 18:30–23:59 |
| 7 | `{CODE} Support: Lifeboat` | +1 | same | 18:30–23:59 |
| 8 | `{CODE} Support: Contract` | +2 | same | 22:00–23:59 |
| 9 | `{CODE} Support: Cradle` | +3 | same | 17:30–23:59 |

End dates are start-of-next-day (Google all-day events are end-exclusive — this is
what your existing rows already do). Support nights are constant in every city and
key off the Breakthrough start date. Timezone = America/Chicago.
Workshops (e.g. Relationships) → 1 row.

**Venues** (scraped per phase from each detail page):
- Vegas → the LV Training Center address on every row.
- Austin → Explore = Doubletree (Grand Ballroom); Breakthrough + all 4 Support nights
  = Holiday Inn (Sunflower Marigold); Redesign weekends = **blank** (the site publishes
  no venue for them). If a detail page's venue can't be parsed, that row is left blank
  rather than guessed.

## Install (once)

1. Open the sheet → **Extensions → Apps Script**, paste `Code.gs`, **Save**.
   Set `SPREADSHEET_ID`, `CALENDAR_ID` and `EMAIL_SUMMARY_TO` in `CONFIG`.
2. **Set the project time zone** to America/Chicago: left sidebar ⚙ **Project Settings**
   → Time zone. (Ensures all-day dates and Support-night times land correctly.)
3. With `DRY_RUN: true`, pick `atlasUpdate` → **Run**. Approve the permission prompt —
   it now also asks for **Calendar** access. The log shows what it *would* do
   (`New rows to add: N`, `Calendar events to create: N`); nothing is written yet.
4. When the counts look right, set **`DRY_RUN: false`**, **Save**, **Run `atlasUpdate`**
   once. It appends new rows, creates the events, and writes Event IDs back.
5. Spot-check one event on the Atlas Trainings calendar (dates, an all-day span, a
   Support night's time, the venue). Then run **`installWeeklyTrigger`** once →
   `atlasUpdate` runs every **Monday ~7am**.
6. **Stop running the Sheet2Cal export** for these rows — the script owns event
   creation now, and running both would create duplicates.

Each week you get an email summary (e.g. "9 rows appended, 9 events created" or, most
weeks, "0 rows, 0 events").

## How events are created

`createMissingEvents_` scans every data row and only acts on rows that have a Title but
an **empty Event ID** cell. For each of those it first checks the calendar for an event
with the same title on that day: if one already exists (e.g. from an earlier manual
Sheet2Cal export) it **links** to it — backfilling the Event ID, creating nothing — so
there is never a duplicate. Otherwise it creates the event and writes the new Event ID
back. Rows with a Start Time → timed events; rows without → multi-day all-day events
(End exclusive). Flip `CREATE_EVENTS: false` to go back to sheet-only (no calendar writes).

## Safety notes

- **Dedupe** is on `Title + Start date`, so re-running never double-adds, and a new
  `Relationships` in 2027 won't collide with the 2026 one.
- **Never guesses.** If a detail page hasn't published all 5 dates yet, that cohort
  is listed in the email as "needs manual entry" instead of being written half-built.
- **TBD workshops** (Warriors' Council, Mastery, Grace) are reported but skipped
  until they have real dates.
- The script writes columns **A–O** (adds `Delete/Update = FALSE` and `Timezone`) so
  new rows fully match your existing rows and the calendar add-on picks them up. It
  never touches columns P–U (Event ID, Link, etc.) — the add-on fills those on sync.

## Maintenance

Validated against your live sheet: ATX20 and LAS16 regenerate **byte-for-byte** to
the rows already there. If Atlas ever changes their page layout and dates stop
appearing, you'll see it immediately in the monthly email (0 rows + the cohort listed
as "needs manual entry"), not silently. The parser + regression tests live in
`scratchpad/atlas/` for this session if you want to re-check after a site change.
