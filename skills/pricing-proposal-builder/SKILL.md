---
name: pricing-proposal-builder
description: Build a client-ready pricing proposal, monetization recommendation, or sales-comp plan the f13i way — recommendation-led, every number defended with a framework, CEO pressure-tested, then logged to the deal file. ALWAYS use this skill when Farhan is building a pricing proposal, pricing model, packaging recommendation, monetization plan, discount structure, or sales compensation / commission plan for a client (e.g. "build the Vectra proposal", "put together a pricing model for Cloudline", "draft a comp plan for Munch", "help me with Paywell pricing", "AirPLAi pricing handoff"). Also trigger when he's iterating on numbers from a prior session, defending pricing decisions, or prepping a proposal to send. This is his core billable deliverable — reach for it whenever a client pricing artifact is being created or revised.
---

# Pricing Proposal Builder

This is Farhan's highest-value repeated work: turning a discovery call into a defensible pricing or comp recommendation a client's CEO can act on. He's done it for Vectra, Cloudline, Paywell, Forgeworks, AirPLAi, Munch, Cordia, Volt and more — each time from scratch, each time re-deriving the same principles by hand. This skill encodes the f13i method so every proposal starts at his standard instead of at zero.

The point is not to spit out numbers. Farhan's whole differentiation, in his own words from past sessions: **"more important than numbers, we deliver frameworks for how to think and then let the CEO make the decision."** A proposal that just asserts "$80K base, 22% commission" is worthless to him. A proposal that shows *why* each number falls out of a defensible framework — and hands the CEO the levers — is the product.

## Before you build: load the context

A grounded proposal beats a generic one every time. Pull what exists before drafting:

1. **The deal file.** Client deals live in his Obsidian vault under `30-deals/<client>/` (e.g. `30-deals/vectra/index.md`). Read the index for meeting context, prior pricing decisions, current status, and stakeholder map. Use the `obsidian` tools.
2. **The discovery call.** The relevant Granola transcript holds the real constraints — current ARR, ACV, customer count, who the decision maker is, what "fire" the client flagged. Pull it via the Granola tools if not already summarized in the deal file.
3. **The lessons log.** `20-agents/07-lessons.md` has a `proposals` section of hard-won rules. Read it — it grows over time and may contain client-specific or newly-learned rules beyond the ones below.
4. **f13i context.** If voice or positioning matters for the written artifact, load his docs (`load-f13i-docs`).

If a deal file doesn't exist yet, that's fine — build from what Farhan gives you and create the deal file at the end.

## The f13i proposal method

These rules come directly from Farhan's own corrections across past proposals. They are the difference between a draft he sends and one he rewrites.

**Lead with the recommendation, not a menu of options.** Don't present three tiers and ask him to choose. State the recommended structure up front, then show the reasoning. Options dilute authority; a clear recommendation with defensible logic is what a consultant is paid for.

**Defend every number with a framework, then hand the CEO the lever.** For each figure (base, quota, OTE, BCR, price point, discount floor), don't just state it — explain the mechanism that produces it, benchmark it, and make explicit the trade-off the CEO is actually deciding. The number is a position within a range; the framework is the product. Example from the Munch comp plan: BCR isn't chosen, it *falls out* of quota ÷ variable — so defend the quota and the variable, and the BCR defends itself.

**Frame the problem sharply, even accusatorially.** Open the proposal by naming the actual problem the client has, plainly. A soft problem statement makes the whole recommendation feel optional. (Lesson: "accusatory problem framing.")

**Never name the referral source in the proposal.** Whoever introduced the deal does not appear in the client-facing document.

**The "For:" / decision-maker is the person who signs, not your contact.** Address the proposal to whoever actually makes the call, even if you've been talking to someone else.

**Bundle and discount math must be shown visually.** If there's a bundle discount or blended rate, show the arithmetic (a small table), don't just state the net. Clients need to see the math to trust it.

**Run a CEO pressure test before it's "done."** Before declaring a proposal ready, adversarially poke it as a skeptical CEO would: "Why this number and not one 20% lower? What happens if attainment is half? Where does this cost me if the motion doesn't prove out?" Fix what doesn't survive. Only then is it sendable.

## Output structure

Adapt to the artifact type (pricing model vs. comp plan vs. packaging proposal), but hold this shape:

```
## <Client> — <artifact name>

### The problem
<Sharp, specific statement of what's broken and what it's costing them.>

### Recommendation
<The headline structure, stated plainly and up front. Lead here.>

### <Each component, defended>
For every number: the mechanism that produces it · the benchmark · the trade-off the CEO is deciding.
Use tables for anything with math (rates, tiers, bundle discounts, ramp).

### Pressure test
<The 2–4 hardest CEO objections and how the structure answers them.>

### What to decide
<The handful of genuine judgment calls left to the client, with the framework for each.>
```

End the client-facing artifact with an offer to formalize it into a sendable document (Farhan often asks "turn this into a formal plan doc" — offer it, and use the `docx` or `pptx` skill if he says yes).

## After the build: log it

Farhan closes every proposal session by updating his vault. Do this automatically, don't make him ask:

1. **Update the deal index** (`30-deals/<client>/index.md`): today's session, the proposal summary, the pricing/comp decisions made, current status, strategic notes on why the deal moves and where the risk sits, and clear next steps.
2. **Append new lessons** to `20-agents/07-lessons.md` under `proposals` — any new rule or pattern that surfaced this session, phrased generally so it compounds. If Farhan corrected you on something, that correction is a lesson; capture it.

## Taste notes

- **Frameworks over assertions, always.** If you catch yourself listing numbers without the reasoning that produces them, stop — that's the exact output Farhan rejects.
- **Match the artifact to the ask.** A commission plan, a SaaS packaging redesign, and a price-increase model are different shapes. Don't force a comp-plan template onto a packaging problem.
- **Be honest about what's a judgment call.** Numbers that genuinely depend on the CEO's risk appetite (quota aggressiveness, discount floors) should be surfaced *as* decisions, not buried as if they were derived. That honesty is what makes the derived numbers credible.
- **Keep the client's real constraints in view.** Grounding a quota in "8 customers at $17K ACV, unproven motion" beats any benchmark. Bottoms-up beats top-down.

---

## Preflight — resolve tool signatures at runtime

**Do not trust the tool names or parameter names written above.** They drift, and
a stale signature fails silently — the skill keeps running and produces confident
output with a source quietly missing.

Before the first Granola or Obsidian call, run `tool_search` for each ("granola meetings", "obsidian get note") and use the
names and parameters it returns. Names in this file are correct as of 2026-09-15;
parameter schemas are deliberately not documented here, because hardcoding them is
what broke `call-prep` and `outbound-sync` for months before anyone noticed.

**Failure behaviour:** if a source fails, name it in the output. A proposal missing the discovery-call leg will contradict what the client said in the room. A partial
result that says which leg died beats a clean-looking one that dropped a source.
