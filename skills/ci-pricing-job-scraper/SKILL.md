---
name: ci-pricing-job-scraper
description: >
  Scrape LinkedIn and job boards for companies hiring pricing, competitive
  intelligence, or pricing-adjacent PMM roles — then merge results into
  Farhan's CI/Pricing prospect spreadsheet. ALWAYS use this skill when Farhan
  says "run the job scraper", "scrape CI jobs", "find pricing roles",
  "update my prospect list", "refresh broken URLs", "scrape LinkedIn jobs",
  "find companies hiring for pricing", "run the lead scraper", or any
  variation of wanting to find SaaS companies with open pricing/CI positions.
  Also trigger when Farhan uploads a spreadsheet of prospects and asks to
  validate or refresh posting URLs. This skill uses Apify LinkedIn Jobs
  Scraper for discovery and the RAG Web Browser for company-specific URL
  validation.
---

# CI & Pricing Job Scraper

Two-mode pipeline for building and maintaining f13i's lead list of companies
hiring for pricing, competitive intelligence, or pricing-adjacent PMM roles.

---

## Modes

### Mode 1: Discovery (find NEW companies)

Run the Apify LinkedIn Jobs Scraper (`curious_coder/linkedin-jobs-scraper`)
with broad keyword queries to find companies you don't already know about.

**Default search URLs** (pass as `urls` array):
```
https://www.linkedin.com/jobs/search/?keywords=%22pricing+strategy%22+OR+%22pricing+manager%22&f_I=96%2C4%2C6&position=1&pageNum=0
https://www.linkedin.com/jobs/search/?keywords=%22competitive+intelligence%22+OR+%22competitive+analyst%22&f_I=96%2C4%2C6&position=1&pageNum=0
https://www.linkedin.com/jobs/search/?keywords=%22pricing+PMM%22+OR+%22head+of+pricing%22&f_I=96%2C4%2C6&position=1&pageNum=0
https://www.linkedin.com/jobs/search/?keywords=%22monetization%22+AND+%22product%22+AND+%22pricing%22&f_I=96%2C4%2C6&position=1&pageNum=0
```

**Industry codes in URLs:**
- `96` = IT Services and IT Consulting
- `4` = Computer Software
- `6` = Internet

**Apify actor call:**
```json
{
  "actor": "curious_coder/linkedin-jobs-scraper",
  "input": {
    "urls": ["<search URLs above>"],
    "count": 100,
    "scrapeCompany": true
  }
}
```

**Output fields to extract:**
- `companyName` → Company
- `title` → Role Title(s)
- `link` → Posting URL (always a valid LinkedIn URL)
- `location` → Location
- `postedAt` → Post date
- `descriptionText` → Full JD (for ICP scoring + hook research)
- `companyWebsite` → Company website
- `companyEmployeesCount` → Employee count (for stage estimation)
- `industries` → Vertical
- `seniorityLevel` → Seniority
- `jobPosterName` / `jobPosterTitle` → Hiring manager info

### Mode 2: Validation (fix broken URLs for KNOWN companies)

For companies already in the spreadsheet with broken URLs (⚠️ status), use
the `apify/rag-web-browser` to find the correct LinkedIn job posting URL.

**For each broken company, run:**
```json
{
  "actor": "apify/rag-web-browser",
  "input": {
    "query": "site:linkedin.com/jobs/view \"<Company Name>\" \"<key role words>\"",
    "maxResults": 3,
    "outputFormats": ["text"]
  }
}
```

**Extract the LinkedIn URL** from `searchResult.url` where the title matches.
If no LinkedIn match, try without `site:linkedin.com`:
```json
{
  "query": "\"<Company Name>\" \"<Role Title>\" job posting"
}
```

**Update rules:**
- Only replace URLs where `Validation Status` contains ⚠️
- Set new status to: `✅ Verified via LinkedIn (Apify refresh <date>)`
- NEVER overwrite existing ✅ validated URLs
- Keep ALL other columns untouched

---

## ICP Scoring (for new companies from Discovery mode)

Score each new company on a 3-tier scale using JD signals:

**High ICP:**
- JD mentions: first pricing hire, building pricing function, AI pricing,
  usage-based, packaging, monetization strategy
- Company stage: Series A-C, 50-1000 employees
- Has a public pricing page (bonus signal)

**Medium ICP:**
- PMM role with CI or pricing ownership mentioned
- Larger company (1000+) but active pricing changes
- Industry match but unclear if consulting-ready

**Low ICP:**
- Enterprise (10K+), no consulting budget signal
- Role is pure CI with no pricing component
- Non-SaaS industry

---

## Role Type Classification

Classify each role into one of:
- `Pricing` — dedicated pricing strategy/monetization role
- `CI` — competitive intelligence focused
- `PMM-with-Pricing` — PMM role with explicit pricing responsibility
- `PMM-with-CI` — PMM role with CI component
- `Both` — company hiring for BOTH pricing and CI simultaneously

---

## PricingSaaS Enrichment (optional, for High ICP)

For High ICP companies, check PricingSaaS for recent pricing changes:
```
Use PricingMCP:get_company_history with slug derived from company name
```

If pricing changes detected, note in `Pricing Change Signal` column and
adjust `Hook Type` accordingly:
- Price increased → `Bug` hook
- Plan restructured → `Left on table` hook  
- No public pricing → `JD signal` hook
- Active competitor in their space → `Competitive gap` hook

---

## Output Format

### For Discovery mode:
Output a spreadsheet (xlsx) matching the existing column structure:
```
Company | Role Title(s) | Posting URL | Validation Status | Hiring Manager |
Company Stage | Pricing Page URL | Pricing Model | Recent Pricing Changes |
Key JD Pain Signals | Multiple Roles? | ICP Fit | Role Type | Hook Type |
Hook Suggestion | Vertical | Pricing Change Signal
```

### For Validation mode:
Output an updated version of the input spreadsheet with:
- Broken URLs replaced
- Validation Status updated
- All other columns preserved exactly

---

## Workflow Sequence

### Discovery run:
1. Call Apify LinkedIn Jobs Scraper with keyword URLs
2. Retrieve results via `get-actor-output`
3. Dedup against existing company list (if provided)
4. ICP score new companies
5. Classify role types
6. Enrich High ICP companies via PricingSaaS (if time permits)
7. Generate hook suggestions for High ICP companies
8. Output merged spreadsheet

### Validation run:
1. Read input spreadsheet
2. Identify rows where Validation Status contains ⚠️
3. For each broken row, search for LinkedIn job URL
4. Update Posting URL and Validation Status
5. Output updated spreadsheet

---

## Important Notes

- The free LinkedIn Jobs Scraper (`curious_coder/linkedin-jobs-scraper`) uses
  LinkedIn's PUBLIC search. It does NOT support company-name filtering. Keyword
  searches return jobs from ALL companies matching those keywords. This is GOOD
  for discovery but BAD for company-specific validation.
  
- For company-specific URL validation, use `apify/rag-web-browser` with
  Google search operators like `site:linkedin.com/jobs/view "Company Name"`.

- LinkedIn deactivates filled roles, so results are inherently current.

- At $0.001/result, a 500-job discovery run costs $0.50.

- Schedule discovery runs weekly (Monday 6am CT) via Apify scheduler for
  ongoing pipeline feed.
