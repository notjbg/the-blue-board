# TODO — gstack roadmap

## Phase 1: Foundations (v0.2.0)
  - [x] Rename to gstack
  - [x] Restructure to monorepo layout
  - [x] Setup script for skill symlinks
  - [x] Snapshot command with ref-based element selection
  - [x] Snapshot tests

## Phase 2: Enhanced Browser
  - [ ] Annotated screenshots (--annotate flag, numbered labels on elements mapped to refs)
  - [ ] Snapshot diffing (compare before/after accessibility trees, verify actions worked)
  - [ ] Dialog handling (dialog accept/dismiss — prevents browser lockup)
  - [ ] File upload (upload <sel> <files>)
  - [ ] Cursor-interactive elements (-C flag, detect divs with cursor:pointer/onclick/tabindex)
  - [ ] Element state checks (is visible/enabled/checked <sel>)

## Phase 3: QA Testing Agent (dogfood skill)
  - [ ] SKILL.md — 6-phase workflow: Initialize → Authenticate → Orient → Explore → Document → Wrap up
  - [ ] Issue taxonomy reference (7 categories: visual, functional, UX, content, performance, console, accessibility)
  - [ ] Severity classification (critical/high/medium/low)
  - [ ] Exploration checklist per page
  - [ ] Report template (structured markdown with per-issue evidence)
  - [ ] Repro-first philosophy: every issue gets evidence before moving on
  - [ ] Two evidence tiers: interactive bugs (video + step-by-step screenshots), static bugs (single annotated screenshot)
  - [ ] Video recording (record start/stop for WebM capture via Playwright)
  - [ ] Key guidance: 5-10 well-documented issues per session, depth over breadth, write incrementally

## Phase 4: Skill + Browser Integration
  - [ ] ship + browse: post-deploy verification
    - Browse staging/preview URL after push
    - Screenshot key pages
    - Check console for JS errors
    - Compare staging vs prod via snapshot diff
    - Include verification screenshots in PR body
    - STOP if critical errors found
  - [ ] review + browse: visual diff review
    - Browse PR's preview deploy
    - Annotated screenshots of changed pages
    - Compare against production visually
    - Check responsive layouts (mobile/tablet/desktop)
    - Verify accessibility tree hasn't regressed
  - [ ] deploy-verify skill: lightweight post-deploy smoke test
    - Hit key URLs, verify 200s
    - Screenshot critical pages
    - Console error check
    - Compare against baseline snapshots
    - Pass/fail with evidence

## Phase 5: State & Sessions
  - [ ] Sessions (isolated browser instances with separate cookies/storage/history)
  - [ ] State persistence (save/load cookies + localStorage to JSON files)
  - [ ] Auth vault (encrypted credential storage, referenced by name, LLM never sees passwords)
  - [ ] retro + browse: deployment health tracking
    - Screenshot production state
    - Check perf metrics (page load times)
    - Count console errors across key pages
    - Track trends over retro window

## Phase 6: Advanced Browser
  - [ ] Iframe support (frame <sel>, frame main)
  - [ ] Semantic locators (find role/label/text/placeholder/testid with actions)
  - [ ] Device emulation presets (set device "iPhone 16 Pro")
  - [ ] Network mocking/routing (intercept, block, mock requests)
  - [ ] Download handling (click-to-download with path control)
  - [ ] Content safety (--max-output truncation, --allowed-domains)
  - [ ] Streaming (WebSocket live preview for pair browsing)
  - [ ] CDP mode (connect to already-running Chrome/Electron apps)

## Ideas & Notes
  - Browser is the nervous system — every skill should be able to see, interact with, and verify the web
  - Skills are the product; the browser enables them
  - One repo, one install, entire AI engineering workflow
  - Bun compiled binary matches Rust CLI performance for this use case (bottleneck is Chromium, not CLI parsing)
  - Accessibility tree snapshots use ~200-400 tokens vs ~3000-5000 for full DOM — critical for AI context efficiency
  - Locator map approach for refs: store Map<string, Locator> on BrowserManager, no DOM mutation, no CSP issues
  - Snapshot scoping (-i, -c, -d, -s flags) is critical for performance on large pages
  - All new commands follow existing pattern: add to command set, add switch case, return string
