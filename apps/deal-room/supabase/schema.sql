-- The Deal Room — Content Pipeline schema (Phase 1)
-- Run once in the Supabase SQL editor (Project -> SQL Editor -> New query -> Run).
-- Re-runnable: drops and recreates cleanly.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

drop table if exists agent_events cascade;
drop table if exists content_pieces cascade;

create table content_pieces (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  stage           text not null default 'idea'
                    check (stage in ('idea', 'draft', 'qa', 'ready', 'published')),
  format          text not null default 'article'
                    check (format in ('article', 'quick_take', 'deep_dive', 'case_study', 'roundup')),
  topic_tags      text[] not null default '{}',
  hook            text not null default '',
  notes           text not null default '',
  inspiration_url text not null default '',
  -- free-form (not an enum) so Phase 2 agent names slot in without a migration
  assigned_to     text not null default 'unassigned',
  -- null in Phase 1; agents write "writing" / "waiting for review" etc. in Phase 2
  agent_status    text,
  human_override  boolean not null default false,
  word_count      int,
  issue_number    int,
  beehiiv_post_id text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  published_at    timestamptz,
  -- when the piece last entered its current stage (drives the age indicator)
  stage_since     timestamptz not null default now()
);

-- Phase 2 scaffold: append-only agent activity log. Empty in Phase 1.
create table agent_events (
  id                uuid primary key default gen_random_uuid(),
  content_piece_id  uuid not null references content_pieces(id) on delete cascade,
  agent_name        text not null,
  event             text not null,
  created_at        timestamptz not null default now()
);

create index content_pieces_stage_idx on content_pieces (stage);
create index content_pieces_override_idx on content_pieces (human_override);
create index agent_events_piece_idx on agent_events (content_piece_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Keep updated_at fresh, reset stage_since whenever stage changes,
-- and stamp published_at when a piece first reaches 'published'.
create or replace function content_pieces_touch()
returns trigger as $$
begin
  new.updated_at := now();
  if new.stage is distinct from old.stage then
    new.stage_since := now();
    if new.stage = 'published' and old.stage <> 'published' then
      new.published_at := coalesce(new.published_at, now());
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger content_pieces_touch_trg
  before update on content_pieces
  for each row execute function content_pieces_touch();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Single-operator, local-only v1: permissive anon all-access policy.
-- NOTE (Phase 2 hardening): replace with authenticated policies + a service
-- role for agent writes before this is ever deployed beyond localhost.
-- ---------------------------------------------------------------------------

alter table content_pieces enable row level security;
alter table agent_events enable row level security;

create policy "anon full access on content_pieces"
  on content_pieces for all to anon using (true) with check (true);

create policy "anon full access on agent_events"
  on agent_events for all to anon using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table content_pieces;
alter publication supabase_realtime add table agent_events;

-- ---------------------------------------------------------------------------
-- Seed data — ~8 pieces across stages so the board isn't empty on first run.
-- Includes one human_override card and rows backdated to exercise the
-- age-indicator tiers (>7d yellow, >14d orange).
-- ---------------------------------------------------------------------------

insert into content_pieces
  (title, stage, format, topic_tags, hook, notes, assigned_to, human_override,
   word_count, issue_number, agent_status, stage_since, created_at, published_at)
values
  ('Why usage-based pricing breaks at scale', 'idea', 'deep_dive',
   '{pricing,usage-based}', 'The metric you bill on is the metric you optimize against — usually the wrong one.',
   'Sparked from the Granola call with the Series B founder.', 'unassigned', false,
   null, null, null, now(), now(), null),

  ('5 SaaS pricing pages that quietly raised prices', 'idea', 'roundup',
   '{pricing,teardown}', 'Nobody announced it. The Wayback Machine did.',
   '', 'unassigned', false, null, null, null,
   now() - interval '9 days', now() - interval '9 days', null),

  ('The discounting death spiral', 'draft', 'article',
   '{discounting,sales}', 'Every quarter-end discount trains the buyer to wait for the next one.',
   'Half drafted. Need the cohort data to back the retention claim.', 'farhan', false,
   620, 12, null, now() - interval '2 days', now() - interval '6 days', null),

  ('Packaging vs pricing: the distinction nobody makes', 'draft', 'deep_dive',
   '{packaging,strategy}', 'You can fix bad pricing in a quarter. Bad packaging takes a rebrand.',
   'Stuck — outline is messy, needs a restructure.', 'farhan', true,
   340, 12, null, now() - interval '16 days', now() - interval '20 days', null),

  ('Anatomy of a price increase email', 'qa', 'case_study',
   '{pricing,retention}', 'The 4 sentences that decide whether churn spikes or holds.',
   'Draft done, needs a fact-check pass on the churn stats.', 'farhan', false,
   910, 11, null, now() - interval '3 days', now() - interval '10 days', null),

  ('Quick take: seat-based pricing is not dead', 'ready', 'quick_take',
   '{pricing,seats}', 'Everyone declared seats dead in 2023. The public filings disagree.',
   'Cleared QA. Ready to schedule.', 'farhan', false,
   280, 11, null, now() - interval '1 days', now() - interval '5 days', null),

  ('How we repriced a vertical SaaS in 30 days', 'published', 'case_study',
   '{pricing,consulting,case-study}', 'No new features. Same product. 22% more revenue.',
   'Issue 10 lead story.', 'farhan', false,
   1450, 10, null, now() - interval '14 days', now() - interval '30 days', now() - interval '14 days'),

  ('The willingness-to-pay survey that lied to you', 'published', 'article',
   '{pricing,research,wtp}', 'Stated WTP and revealed WTP are different animals. One of them pays the bills.',
   'Issue 9.', 'farhan', false,
   1100, 9, null, now() - interval '28 days', now() - interval '44 days', now() - interval '28 days');
