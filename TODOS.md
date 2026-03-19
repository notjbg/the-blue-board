# TODOs

Deferred work from plan reviews. Each item includes context so it can be picked up months later.

---

## P2: Auto-Curated News Aggregation (AI Pipeline)

**What:** Build an AI pipeline that monitors United's newsroom RSS, Reddit r/unitedairlines, FlyerTalk, and Twitter for United news. Uses Claude to summarize, tag, and generate draft news entries in the same format as `src/data/news/index.js`.

**Why:** Removes the manual curation bottleneck. Currently adding 2-5 articles/month by editing a JS file. An AI pipeline could surface 10-20/month with human review, keeping the news hub fresh and expanding SEO surface area.

**Pros:** Scales content creation, keeps news hub fresh even when busy, more SEO entry points.

**Cons:** Claude API costs (~$0.01-0.05 per article summary), needs human review before publish, source RSS/API access varies by platform.

**Context:** The news data model (`src/data/news/index.js`) already supports this — the pipeline would generate the same JS data entries you write manually. Could run as a weekly cron that drafts articles for review. The Resend Audiences integration (from news-notify) means new articles automatically trigger email digests.

**Effort:** L (human) → M (CC+gstack)
**Depends on:** News hub v1 shipped, Pro tier revenue to cover AI costs.
**Added:** 2026-03-19 via /plan-ceo-review
