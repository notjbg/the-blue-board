---
name: retro
version: 1.0.0
description: |
  Weekly engineering retrospective. Analyzes commit history, work patterns,
  and code quality metrics with persistent history and trend tracking.
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
---

# /retro — Weekly Engineering Retrospective

Generates a comprehensive engineering retrospective analyzing commit history, work patterns, and code quality metrics. Designed for a senior IC/CTO-level builder using Claude Code as a force multiplier.

## User-invocable
When the user types `/retro`, run this skill.

## Arguments
- `/retro` — default: last 7 days
- `/retro 24h` — last 24 hours
- `/retro 14d` — last 14 days
- `/retro 30d` — last 30 days
- `/retro compare` — compare current window vs prior same-length window
- `/retro compare 14d` — compare with explicit window

## Instructions

Parse the argument to determine the time window. Default to 7 days if no argument given. Use `--since="N days ago"`, `--since="N hours ago"`, or `--since="N weeks ago"` (for `w` units) for git log queries. All times should be reported in **Pacific time** (use `TZ=America/Los_Angeles` when converting timestamps).

**Argument validation:** If the argument doesn't match a number followed by `d`, `h`, or `w`, the word `compare`, or `compare` followed by a number and `d`/`h`/`w`, show this usage and stop:
```
Usage: /retro [window]
  /retro              — last 7 days (default)
  /retro 24h          — last 24 hours
  /retro 14d          — last 14 days
  /retro 30d          — last 30 days
  /retro compare      — compare this period vs prior period
  /retro compare 14d  — compare with explicit window
```

### Step 1: Gather Raw Data

First, fetch origin to ensure we have the latest:
```bash
git fetch origin main --quiet
```

Run ALL of these git commands in parallel (they are independent):

```bash
# 1. All commits in window with timestamps, subject, hash, files changed, insertions, deletions
git log origin/main --since="<window>" --format="%H|%ai|%s" --shortstat

# 2. Per-commit test vs total LOC breakdown (single command, parse output)
#    Each commit block starts with COMMIT:<hash>, followed by numstat lines.
#    Separate test files (matching test/|spec/|__tests__/) from production files.
git log origin/main --since="<window>" --format="COMMIT:%H" --numstat

# 3. Commit timestamps for session detection and hourly distribution
#    Use TZ=America/Los_Angeles for Pacific time conversion
TZ=America/Los_Angeles git log origin/main --since="<window>" --format="%at|%ai|%s" | sort -n

# 4. Files most frequently changed (hotspot analysis)
git log origin/main --since="<window>" --format="" --name-only | grep -v '^$' | sort | uniq -c | sort -rn

# 5. PR numbers from commit messages (extract #NNN patterns)
git log origin/main --since="<window>" --format="%s" | grep -oE '#[0-9]+' | sed 's/^#//' | sort -n | uniq | sed 's/^/#/'
```

### Step 2: Compute Metrics

Calculate and present these metrics in a summary table:

| Metric | Value |
|--------|-------|
| Commits to main | N |
| PRs merged | N |
| Total insertions | N |
| Total deletions | N |
| Net LOC added | N |
| Test LOC (insertions) | N |
| Test LOC ratio | N% |
| Version range | vX.Y.Z.W → vX.Y.Z.W |
| Active days | N |
| Detected sessions | N |
| Avg LOC/session-hour | N |

### Step 3: Commit Time Distribution

Show hourly histogram in Pacific time using bar chart:

```
Hour  Commits  ████████████████
 00:    4      ████
 07:    5      █████
 ...
```

Identify and call out:
- Peak hours
- Dead zones
- Whether pattern is bimodal (morning/evening) or continuous
- Late-night coding clusters (after 10pm)

### Step 4: Work Session Detection

Detect sessions using **45-minute gap** threshold between consecutive commits. For each session report:
- Start/end time (Pacific)
- Number of commits
- Duration in minutes

Classify sessions:
- **Deep sessions** (50+ min)
- **Medium sessions** (20-50 min)
- **Micro sessions** (<20 min, typically single-commit fire-and-forget)

Calculate:
- Total active coding time (sum of session durations)
- Average session length
- LOC per hour of active time

### Step 5: Commit Type Breakdown

Categorize by conventional commit prefix (feat/fix/refactor/test/chore/docs). Show as percentage bar:

```
feat:     20  (40%)  ████████████████████
fix:      27  (54%)  ███████████████████████████
refactor:  2  ( 4%)  ██
```

Flag if fix ratio exceeds 50% — this signals a "ship fast, fix fast" pattern that may indicate review gaps.

### Step 6: Hotspot Analysis

Show top 10 most-changed files. Flag:
- Files changed 5+ times (churn hotspots)
- Test files vs production files in the hotspot list
- VERSION/CHANGELOG frequency (version discipline indicator)

### Step 7: PR Size Distribution

From commit diffs, estimate PR sizes and bucket them:
- **Small** (<100 LOC)
- **Medium** (100-500 LOC)
- **Large** (500-1500 LOC)
- **XL** (1500+ LOC) — flag these with file counts

### Step 8: Focus Score + Ship of the Week

**Focus score:** Calculate the percentage of commits touching the single most-changed top-level directory (e.g., `app/services/`, `app/views/`). Higher score = deeper focused work. Lower score = scattered context-switching. Report as: "Focus score: 62% (app/services/)"

**Ship of the week:** Auto-identify the single highest-LOC PR in the window. Highlight it:
- PR number and title
- LOC changed
- Why it matters (infer from commit messages and files touched)

### Step 9: Week-over-Week Trends (if window >= 14d)

If the time window is 14 days or more, split into weekly buckets and show trends:
- Commits per week
- LOC per week
- Test ratio per week
- Fix ratio per week
- Session count per week

### Step 10: Streak Tracking

Count consecutive days with at least 1 commit to origin/main, going back from today:

```bash
# Get all unique commit dates (Pacific time) — no hard cutoff
TZ=America/Los_Angeles git log origin/main --format="%ad" --date=format:"%Y-%m-%d" | sort -u
```

Count backward from today — how many consecutive days have at least one commit? This queries the full history so streaks of any length are reported accurately. Display: "Shipping streak: 47 consecutive days"

### Step 11: Load History & Compare

Before saving the new snapshot, check for prior retro history:

```bash
ls -t .context/retros/*.json 2>/dev/null
```

**If prior retros exist:** Load the most recent one using the Read tool. Calculate deltas for key metrics and include a **Trends vs Last Retro** section:
```
                    Last        Now         Delta
Test ratio:         22%    →    41%         ↑19pp
Sessions:           10     →    14          ↑4
LOC/hour:           200    →    350         ↑75%
Fix ratio:          54%    →    30%         ↓24pp (improving)
Commits:            32     →    47          ↑47%
Deep sessions:      3      →    5           ↑2
```

**If no prior retros exist:** Skip the comparison section and append: "First retro recorded — run again next week to see trends."

### Step 12: Save Retro History

After computing all metrics (including streak) and loading any prior history for comparison, save a JSON snapshot:

```bash
mkdir -p .context/retros
```

Determine the next sequence number for today (substitute the actual date for `$(date +%Y-%m-%d)`):
```bash
# Count existing retros for today to get next sequence number
today=$(TZ=America/Los_Angeles date +%Y-%m-%d)
existing=$(ls .context/retros/${today}-*.json 2>/dev/null | wc -l | tr -d ' ')
next=$((existing + 1))
# Save as .context/retros/${today}-${next}.json
```

Use the Write tool to save the JSON file with this schema:
```json
{
  "date": "2026-03-08",
  "window": "7d",
  "metrics": {
    "commits": 47,
    "prs_merged": 12,
    "insertions": 3200,
    "deletions": 800,
    "net_loc": 2400,
    "test_loc": 1300,
    "test_ratio": 0.41,
    "active_days": 6,
    "sessions": 14,
    "deep_sessions": 5,
    "avg_session_minutes": 42,
    "loc_per_session_hour": 350,
    "feat_pct": 0.40,
    "fix_pct": 0.30,
    "peak_hour": 22
  },
  "version_range": ["1.16.0.0", "1.16.1.0"],
  "streak_days": 47,
  "tweetable": "Week of Mar 1: 47 commits, 3.2k LOC, 38% tests, 12 PRs, peak: 10pm"
}
```

### Step 13: Write the Narrative

Structure the output as:

---

**Tweetable summary** (first line, before everything else):
```
Week of Mar 1: 47 commits, 3.2k LOC, 38% tests, 12 PRs, peak: 10pm | Streak: 47d
```

## Engineering Retro: [date range]

### Summary Table
(from Step 2)

### Trends vs Last Retro
(from Step 11, loaded before save — skip if first retro)

### Time & Session Patterns
(from Steps 3-4)

Narrative interpreting what the patterns mean:
- When the most productive hours are and what drives them
- Whether sessions are getting longer or shorter over time
- Estimated hours per day of active coding
- How this maps to "CEO who also codes" lifestyle

### Shipping Velocity
(from Steps 5-7)

Narrative covering:
- Commit type mix and what it reveals
- PR size discipline (are PRs staying small?)
- Fix-chain detection (sequences of fix commits on the same subsystem)
- Version bump discipline

### Code Quality Signals
- Test LOC ratio trend
- Hotspot analysis (are the same files churning?)
- Any XL PRs that should have been split

### Focus & Highlights
(from Step 8)
- Focus score with interpretation
- Ship of the week callout

### Top 3 Wins
Identify the 3 highest-impact things shipped in the window. For each:
- What it was
- Why it matters (product/architecture impact)
- What's impressive about the execution

### 3 Things to Improve
Specific, actionable, anchored in actual commits. Phrase as "to get even better, you could..."

### 3 Habits for Next Week
Small, practical, realistic for a very busy person. Each must be something that takes <5 minutes to adopt.

### Week-over-Week Trends
(if applicable, from Step 9)

---

## Compare Mode

When the user runs `/retro compare` (or `/retro compare 14d`):

1. Compute metrics for the current window (default 7d) using `--since="7 days ago"`
2. Compute metrics for the immediately prior same-length window using both `--since` and `--until` to avoid overlap (e.g., `--since="14 days ago" --until="7 days ago"` for a 7d window)
3. Show a side-by-side comparison table with deltas and arrows
4. Write a brief narrative highlighting the biggest improvements and regressions
5. Save only the current-window snapshot to `.context/retros/` (same as a normal retro run); do **not** persist the prior-window metrics.

## Tone

- Encouraging but candid, no coddling
- Specific and concrete — always anchor in actual commits/code
- Skip generic praise ("great job!") — say exactly what was good and why
- Frame improvements as leveling up, not criticism
- Keep total output around 2500-3500 words
- Use markdown tables and code blocks for data, prose for narrative
- Output directly to the conversation — do NOT write to filesystem (except the `.context/retros/` JSON snapshot)

## Important Rules

- ALL narrative output goes directly to the user in the conversation. The ONLY file written is the `.context/retros/` JSON snapshot.
- Use `origin/main` for all git queries (not local main which may be stale)
- Convert all timestamps to Pacific time for display (use `TZ=America/Los_Angeles`)
- If the window has zero commits, say so and suggest a different window
- Round LOC/hour to nearest 50
- Treat merge commits as PR boundaries
- Do not read CLAUDE.md or other docs — this skill is self-contained
- On first run (no prior retros), skip comparison sections gracefully
