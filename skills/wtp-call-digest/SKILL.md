---
name: wtp-call-digest
description: "Turn a batch of willingness-to-pay discovery calls into a per-buyer number table, a cross-read of what the calls say together, a vault research note, and a client-channel Slack post. ALWAYS use this skill when Farhan says \"review the WTP calls\", \"digest the pricing discovery calls\", \"summarize the last N WTP conversations for [client]\", \"what did the WTP interviews say\", or asks to post a WTP readout to a client Slack channel. Also trigger at the end of a batch of pricing discovery calls, or when a new Granola meeting titled \"Pricing Discovery\" appears for an active pricing engagement. Do NOT use for a single meeting debrief with no pricing numbers in it — that's the standard debrief flow."
---

# WTP Call Digest

Willingness-to-pay interviews are the most expensive data a pricing engagement
collects — a CISO's hour, a founder's relationship, one shot per buyer. The
failure mode is not collecting them badly. It's collecting them well and then
digesting them into mush: averaged numbers, blended attribution, a summary that
reads fine and can't be acted on.

This skill exists to stop that.

## Trigger phrases
- "Review the last N WTP conversations for [client]"
- "Digest the pricing discovery calls"
- "What did the WTP interviews say"
- "Post a WTP summary to [client]'s channel"

---

## Step 0 — Load the engagement

Read the deal index before touching a transcript. You need the live pricing
structures by name, because the whole job is scoring buyer answers against them.

```bash
VAULT="$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/f13i-brain"
cat "$VAULT/30-deals/[client]/00-INDEX.md"
ls -t "$VAULT/30-deals/[client]/recaps"/*.md | head -1 | xargs cat
```

Pull out, and hold in working memory:
- The **structures under debate** (per-unit vs. subscription vs. entity, etc.) and their current placeholder prices
- The **anchor** the engagement has been using (a competitor invoice, a consultant quote, a list price)
- Any **prior WTP rounds** — this batch either confirms or breaks them
- The **ship date** for the model. It sets how much the open questions matter.

## Step 1 — Resolve the calls

```
tool: Granola list_meetings
time_range: custom, covering the batch window
```

WTP calls are usually a titled series ("Pricing Discovery between [client] and
[buyer]"). Match on the series, not on the date alone — a client working session
in the same window is not a WTP call and must not be folded in.

Confirm the count against what Farhan asked for. If he says "the last two" and
you find three, name the three and ask which two before writing anything.

## Step 2 — Read the full transcripts. Not the summaries.

```
tool: Granola get_meeting_transcript
meeting_id: [one call per invocation]
```

**This is the hard rule of the skill.** Granola's generated notes are good at
decisions and action items and systematically drop exactly what a WTP digest is
made of: the non-starter price, the arithmetic the buyer did out loud, the
comparison they reached for, the sentence where they say the number is about
their approval ceiling rather than your value. Those live in the verbatim and
nowhere else.

If a transcript is missing, say so in the output and digest what you have. Never
substitute the summary and present it as equivalent.

## Step 3 — Extract each buyer to the same schema

One block per buyer. Never merge two buyers into one finding.

**Buyer shape** — headcount, ownership, compliance regime, number of entities /
business units, where they sit relative to the client's target segment. This is
the line that decides whether the numbers generalize, so it goes first.

**The number table.** Every structure under debate gets a row, and every row
needs *both* bounds:

| Structure | Most they'd pay | Non-starter |
|---|---|---|

A ceiling without a non-starter is half a data point. If the buyer only gave one
side, ask for the other in the call; if the call is over, mark the cell `not
asked` — visibly, so it gets asked next time.

**Their arithmetic, verbatim where they showed it.** "4 hours × $250/hr" is worth
more than the $1,000 it produces, because it tells you which input to argue with.

**The anchor they actually reasoned from.** Critical and almost always missed.
A buyer quoting your competitor's invoice is giving you a value signal. A buyer
quoting the largest purchase they've personally gotten approved is giving you a
budget-authority signal. Same number, opposite implications: one says reprice,
the other says re-target or change who signs. Record which it is and quote the
sentence that proves it.

**Current stack and spend** — the adjacent line items with real dollars on them,
plus any overlap percentages they assign to the client's product.

**The outcome they named** — in their words, what they'd actually be buying.

**What they deferred** — the thing they told you to stop selling until something
else is true. Deferrals are roadmap sequencing, not objections.

**Measurement, if they offered one.** Buyers occasionally hand over a
measurement design for free. Capture it in full; it is usually better than
anything built in a working session, because it's the thing they'd defend
internally.

## Step 4 — Cross-read

This is the section that justifies the skill. A stack of per-buyer summaries is
not a digest.

Write only findings that hold across buyers or that conflict interestingly
between them:
- Where did **independent buyers land on the same mechanism** for different reasons
- Where does a live structure **break against both** of them
- Which live price is **outside every ceiling collected** — and whether that reads
  as "cut the price" or "this is a different segment"
- What **nobody** reasoned from that the engagement assumes they would (a dead
  anchor is a finding)
- What both named as the outcome, and whether the client can currently measure it

Each finding is one line of claim plus the evidence. No hedging, no "it seems."

## Step 5 — File to the vault

```bash
VAULT="$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/f13i-brain"
D="$VAULT/30-deals/[client]/wtp"
mkdir -p "$D"
# write to $D/[YYYY-MM-DD]-wtp-round-[N].md
```

Frontmatter: `type: research`, `client`, `created`, `covers`, `participants`,
`also_present`, and a `granola:` list of the note URLs. The vault note is the
long form — full per-buyer detail, every quote. The Slack post is the short form
cut from it. Write the note first; cutting down is easier than padding up.

## Step 6 — Draft the Slack post, and show Farhan first

Structure that works:

1. **Title line** — round, buyer names, date
2. **Segment caveat in the second line.** Not at the bottom. If every buyer is
   sub-250 employees, the reader needs that before the first dollar figure or
   they will over-generalize and you can't take it back.
3. **One block per buyer** — bullets for the number table, then the two or three
   sentences that explain the numbers
4. **The single most striking derived number, called out on its own.** Not a
   number the buyer said — one their answers produce that they didn't compute.
   This is the line that gets read.
5. **"What the calls say together"** — the cross-read, 4–6 bullets
6. **One open question to the group**, tied to the model ship date
7. **Granola links, named by buyer**

Then **stop and show it to Farhan in chat.** Never post to a client channel
unprompted. Flag, in the same message:
- anything that lands harder in writing than it would verbally — a named buyer's
  low ceiling in front of the founder who owns that relationship is the usual one
- whether the Granola links are actually viewable by the channel

## Step 7 — Verify the links, then post

Granola note URLs are `https://notes.granola.ai/d/<meeting_id>`. A note that
isn't shared to the workspace 404s for everyone but Farhan, and a readout with
dead evidence links is worse than one with none. Ask him to open one in a
private window before shipping.

```
tool: Slack send_message
channel_id: [the client's pricing channel]
```

Post only on an explicit yes. Return the message permalink.

---

## Hard rules

1. **Full transcripts, never the generated summary.** The non-starter, the
   arithmetic, and the budget-authority tell are only in the verbatim.
2. **Both bounds on every number.** Ceiling and non-starter. The range is the
   deliverable.
3. **Never average across buyers.** Two buyers is two rows. An average of two
   CISOs at different company sizes describes nobody.
4. **Attribution stays clean.** If Farhan's own recollection blends two calls,
   correct it explicitly and say which finding came from whom. He acts on these
   numbers in front of the client.
5. **Segment caveat leads.** It determines whether any of it generalizes.
6. **Record the anchor, not just the number.** Value anchor and budget-authority
   anchor look identical on a slide and mean opposite things.
7. **Don't recommend a price cut off a ceiling.** A live price above every
   ceiling collected is first a segmentation finding. Cutting is a decision the
   client makes with more than two data points.
8. **Never post to a client channel without approval.**
9. **Deferrals are not objections.** "Seats come later" is sequencing — file it
   as roadmap, not as a lost line item.

## Interview-design notes worth feeding back

If Farhan is still running calls in the batch, these are worth surfacing before
the next one:

- **Never ask which structure they prefer.** They'll name the unit they already
  budget in. Ask for a price against each structure separately, then compare.
- **Ask where the number came from.** "What's that based on?" converted a bare
  $10K into the buyer's entire approval ladder in one question. Highest-yield
  question in the set.
- **Always ask for the non-starter.** "At what price is this a complete
  non-starter?" The gap between ceiling and non-starter is the negotiating room.
- **Batch by segment, never blend.** Enterprise and SMB answers to the same
  question are different data, not noise around a mean.

---

## Preflight — resolve tool signatures at runtime

**Do not trust the tool names or parameter names written above.** They drift.

Before the first Granola, Slack, or Obsidian call, run `tool_search` for each
("granola meetings transcript", "slack send message", "obsidian patch") and use
the names and parameters it returns.

**Failure behaviour:** if a source fails, name it in the output. A digest that
says which call is missing beats a clean-looking one that quietly dropped a
buyer.
