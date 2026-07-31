---
name: netlify-deploy
description: Build, validate, version, and deploy the full f13i.com site to Netlify. ALWAYS use this skill when Farhan says "deploy to Netlify", "push the site", "deploy f13i.com", "update the live site", "Netlify deploy", "push my changes", or any variation of wanting to ship changes to f13i.com. Also trigger automatically when the website-advisor skill has been run and Farhan says "accept these changes" or "implement the improvements". This skill builds the complete deploy folder (index.html, fair-use.html, pricing-problem.html, resources.html, _redirects, og.png), validates all files before touching Netlify, creates a versioned archive, and deploys via Netlify Drop. It never deploys without validation passing and never deploys only index.html — the full folder is always required. Do NOT use for general Netlify questions or other people's sites.
---

# Netlify Deploy Skill

Builds, validates, and deploys the complete f13i.com site to Netlify. Always produces the full required deploy folder. Never ships partial deploys. Creates a versioned archive before every deploy.

---

## Required Deploy Folder

Every deploy **must** include all 6 files. Missing any = deploy aborted.

| File | Purpose |
|------|---------|
| `index.html` | Main homepage |
| `fair-use.html` | Fair use resource page |
| `pricing-problem.html` | Pricing problem resource page |
| `resources.html` | Resources hub |
| `_redirects` | Netlify redirect rules |
| `og.png` | Open Graph image (social sharing) |

---

## Step 0: Determine What's Changing

Ask Farhan (or infer from context) which files are being updated this deploy. Typical cases:

- **Copy-only change** (e.g., hero headline edit): only index.html needs regeneration; others carry over from last deploy
- **New section added**: index.html + possibly resources.html
- **Resource page update**: the specific resource file + resources.html
- **Full rebuild**: all 6 files regenerated

If coming directly from the website-advisor skill, the improvements that were accepted are the changeset.

---

## Step 1: Load Latest Site Files

Fetch the current live state from the last build in `/mnt/user-data/outputs/` (the most recent versioned deploy folder is the known-good source). Always start from the most recent known-good version of each file rather than rebuilding from scratch.

Check `/mnt/user-data/outputs/` first for recently generated files. If not present, use `web_fetch` on:
- `https://f13i.com` → current index
- `https://f13i.com/resources/fair-use` → fair-use page
- `https://f13i.com/resources/pricing-problem` → pricing-problem page
- `https://f13i.com/resources` → resources hub

If web_fetch fails for any page, note it and proceed with rebuilding that page from scratch using known brand specs.

---

## Step 2: Apply the Changes

For each changed file, generate the updated HTML. Apply changes **surgically** — modify only the sections that need to change, carry over everything else verbatim.

### Brand Spec (apply to every file)
- **Fonts**: Instrument Serif (headings) + Inter (body), loaded via Google Fonts
- **Colors**: Background `#090909`, accent orange `#F97316`, text `#D4D4D4`, headings `#fafafa`
- **CTAs**: All booking links → `https://cal.com/farhan-m`, email → `me@f13i.com`
- **Resource links**: Internal links use `/resources/fair-use` and `/resources/pricing-problem`
- **OG tags**: All pages need `og:title`, `og:description`, `og:image` pointing to `/og.png`
- **Meta**: All pages need `<meta charset>`, `<meta viewport>`, `<meta description>`

### _redirects file
Standard Netlify redirects — preserve existing rules, add any new ones:
```
/resources/fair-use /fair-use.html 200
/resources/pricing-problem /pricing-problem.html 200
```

### og.png
Only regenerate if explicitly asked. Otherwise carry over the existing file. Note: `og.png` cannot be generated in this environment — if it's missing, flag it and tell Farhan to upload the existing file from his local machine.

---

## Step 3: Validate All Files

Before touching Netlify, run validation. **Any failure = stop deploy, report the issue.**

### Validation Checklist

**For every HTML file:**
- [ ] Valid `<!DOCTYPE html>` declaration
- [ ] `<html lang="en">` present
- [ ] `<head>` contains `<meta charset="UTF-8">`, `<meta name="viewport" ...>`, `<title>`, `<meta name="description">`
- [ ] `<head>` contains OG tags: `og:title`, `og:description`, `og:image`
- [ ] Google Fonts link present (Instrument Serif + Inter)
- [ ] No broken internal links (check all `href` values for `/resources/fair-use`, `/resources/pricing-problem`)
- [ ] All CTAs point to `cal.com/farhan-m` or `me@f13i.com` (no placeholder links)
- [ ] No `TODO` or `PLACEHOLDER` strings remaining
- [ ] File size < 500KB (flag if larger)
- [ ] CSS is complete — no unclosed braces, no missing rules referenced by classes used in HTML
- [ ] No `<script src="...">` pointing to external CDNs that aren't whitelisted (Google Fonts CDN is fine)

**For _redirects:**
- [ ] Both resource redirects present
- [ ] No duplicate rules

**Cross-file consistency:**
- [ ] Navigation links consistent across all HTML files
- [ ] Brand colors and fonts consistent across all HTML files
- [ ] No file references a page that doesn't exist in the deploy folder

Output a validation report:
```
VALIDATION REPORT
─────────────────
✅ index.html — passed
✅ fair-use.html — passed
✅ pricing-problem.html — passed
✅ resources.html — passed
✅ _redirects — passed
⚠️  og.png — not generated (carry over from last deploy)

All checks passed. Ready to deploy.
```

If any file fails: show exactly which check failed and what the fix is. Do not proceed until all failures are resolved.

---

## Step 4: Create a Versioned Archive

Before deploying, save a versioned snapshot to `/mnt/user-data/outputs/`:

```
f13i-deploy-[YYYY-MM-DD]/
├── index.html
├── fair-use.html
├── pricing-problem.html
├── resources.html
├── _redirects
└── DEPLOY_LOG.md
```

### DEPLOY_LOG.md format:
```markdown
# f13i.com Deploy — [YYYY-MM-DD HH:MM UTC]

## What Changed
- [file]: [brief description of change]
- [file]: [brief description of change]

## Why
[One sentence: what triggered this deploy — website-advisor improvement #N, Farhan requested X, etc.]

## Validation
All 6 files passed validation. See checklist in netlify-deploy skill.

## Files Deployed
- index.html ([size])
- fair-use.html ([size])
- pricing-problem.html ([size])
- resources.html ([size])
- _redirects ([size])
- og.png (carried over / regenerated)

## Previous Deploy
[Date of last deploy if known, or "unknown"]
```

---

## Step 5: Package the Deploy Folder

Zip the deploy folder for Netlify Drop:

```bash
cd /mnt/user-data/outputs/
zip -r f13i-deploy-[YYYY-MM-DD].zip f13i-deploy-[YYYY-MM-DD]/
```

This produces a single `.zip` file the user drags onto Netlify Drop.

---

## Step 6: Present & Deploy Instructions

```
tool: present_files
paths: [
  /mnt/user-data/outputs/f13i-deploy-[YYYY-MM-DD].zip,
  /mnt/user-data/outputs/f13i-deploy-[YYYY-MM-DD]/DEPLOY_LOG.md
]
```

Then give Farhan the exact steps:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEPLOY READY — [Date]
6 files validated · [N] changes applied
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Changes this deploy:
• [brief change 1]
• [brief change 2]

TO DEPLOY:
1. Download the .zip above
2. Go to app.netlify.com → your f13i site
3. Drag the .zip onto the deploy drop zone
4. Wait ~30 seconds for propagation
5. Visit f13i.com and verify the changes live

After deploying, confirm here and I'll log this deploy version.
```

---

## Step 7: Post-Deploy Verification (Optional)

If Farhan confirms the deploy went live, run a quick verification:

```
tool: web_fetch → https://f13i.com
```

Check:
- Page loads without error
- Hero copy matches what was deployed
- CTAs are present and correct

Report: "Live. Hero reads [first 10 words]. CTAs present. ✅"

---

## Rules

- **Never deploy partial folder** — all 6 files required, no exceptions
- **Never deploy without validation passing** — zero tolerance for broken OG tags, placeholder links, or missing CTAs
- **Version every deploy** — DEPLOY_LOG.md is non-negotiable; future Farhan needs to know what was deployed when and why
- **Surgical edits preferred** — don't rebuild a file from scratch if only one section changed; carry over everything else
- **og.png special handling** — it can't be generated in this environment. If it's missing from outputs, always flag it and ask Farhan to supply it from local machine
- **No live Netlify API calls** — deploy is always via Netlify Drop (manual zip upload). This skill packages the zip and gives clear instructions; it doesn't call the Netlify API directly
- **Netlify Drop URL**: `app.netlify.com` → site dashboard → Deploys tab → drag zip
- **If a change breaks validation**, fix it before presenting. Never hand Farhan a broken zip.
- **After deploy confirmed**: offer to write the deploy date and what changed into `10-brain/02-business.md` in the Obsidian vault via `obsidian_append_to_note` (or `obsidian_patch_note` to update a section)
