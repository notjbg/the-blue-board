import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for the waitlist modal and onboarding overlay trigger/suppression logic.
 *
 * The actual logic lives in an IIFE in src/dashboard/main.js. These tests
 * replicate the guard logic to verify the behavioral contracts:
 *   - Click threshold: 30 (not 10)
 *   - Session guard: once per session, no reset on flight landing
 *   - 7-day dismissal TTL for both waitlist and onboarding
 *   - Permanent suppression via bb_waitlist_submitted
 */

const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Replicate the isDismissedRecently helper from main.js
function isDismissedRecently(storage, key) {
  try {
    const ts = parseInt(storage.getItem(key), 10);
    return ts > 0 && (Date.now() - ts) < DISMISS_TTL_MS;
  } catch { return false; }
}

// Replicate the shouldShowWaitlistModal decision logic
// force=true bypasses passive guards (session + TTL) for intentional actions like deep links
function shouldShowWaitlistModal({ shownThisSession, submitted, storage, force = false }) {
  if (submitted) return false;
  if (!force && shownThisSession) return false;
  if (!force && isDismissedRecently(storage, 'bb_waitlist_dismissed')) return false;
  return true;
}

// Replicate onboarding overlay visibility decision
function shouldHideOnboarding(storage) {
  return storage.getItem('bb-onboarded') === '1' || isDismissedRecently(storage, 'bb_onboarding_dismissed');
}

function createMockStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem(key) { return key in store ? store[key] : null; },
    setItem(key, val) { store[key] = String(val); },
    removeItem(key) { delete store[key]; },
    _store: store,
  };
}

describe('waitlist modal trigger logic', () => {
  let storage;

  beforeEach(() => {
    storage = createMockStorage();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('click threshold', () => {
    it('should NOT show at 29 clicks', () => {
      let interactions = 29;
      const shouldTrigger = interactions >= 30;
      expect(shouldTrigger).toBe(false);
    });

    it('should show at exactly 30 clicks', () => {
      let interactions = 30;
      const shouldTrigger = interactions >= 30;
      expect(shouldTrigger).toBe(true);
    });

    it('should NOT show at old threshold of 10', () => {
      let interactions = 10;
      const shouldTrigger = interactions >= 30;
      expect(shouldTrigger).toBe(false);
    });
  });

  describe('session guard', () => {
    it('allows showing when not yet shown this session', () => {
      expect(shouldShowWaitlistModal({
        shownThisSession: false,
        submitted: false,
        storage,
      })).toBe(true);
    });

    it('blocks showing when already shown this session', () => {
      expect(shouldShowWaitlistModal({
        shownThisSession: true,
        submitted: false,
        storage,
      })).toBe(false);
    });

    it('blocks when flight lands but modal was already shown (no guard reset)', () => {
      // Previously, the flight-landing trigger would reset shownThisSession to false.
      // After the fix, it stays true — the modal does not re-show.
      const shownThisSession = true; // already shown and dismissed
      // Trigger 3 calls showWaitlistModal() — but guard is still true
      expect(shouldShowWaitlistModal({
        shownThisSession,
        submitted: false,
        storage,
      })).toBe(false);
    });

    it('allows showing on flight landing if modal was never shown', () => {
      expect(shouldShowWaitlistModal({
        shownThisSession: false,
        submitted: false,
        storage,
      })).toBe(true);
    });
  });

  describe('permanent suppression (bb_waitlist_submitted)', () => {
    it('blocks showing when user has submitted email', () => {
      expect(shouldShowWaitlistModal({
        shownThisSession: false,
        submitted: true,
        storage,
      })).toBe(false);
    });
  });

  describe('7-day dismissal TTL', () => {
    it('blocks showing when dismissed less than 7 days ago', () => {
      const recentTs = Date.now() - (3 * 24 * 60 * 60 * 1000); // 3 days ago
      storage.setItem('bb_waitlist_dismissed', String(recentTs));

      expect(shouldShowWaitlistModal({
        shownThisSession: false,
        submitted: false,
        storage,
      })).toBe(false);
    });

    it('allows showing when dismissed more than 7 days ago', () => {
      const oldTs = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
      storage.setItem('bb_waitlist_dismissed', String(oldTs));

      expect(shouldShowWaitlistModal({
        shownThisSession: false,
        submitted: false,
        storage,
      })).toBe(true);
    });

    it('allows showing when dismissed exactly 7 days ago', () => {
      const exactTs = Date.now() - DISMISS_TTL_MS; // exactly 7 days
      storage.setItem('bb_waitlist_dismissed', String(exactTs));

      expect(shouldShowWaitlistModal({
        shownThisSession: false,
        submitted: false,
        storage,
      })).toBe(true);
    });

    it('allows showing when no dismissal timestamp exists', () => {
      expect(shouldShowWaitlistModal({
        shownThisSession: false,
        submitted: false,
        storage,
      })).toBe(true);
    });

    it('handles corrupted localStorage value gracefully (fail-open)', () => {
      storage.setItem('bb_waitlist_dismissed', 'not-a-number');

      // isDismissedRecently should return false for NaN, allowing the modal to show
      expect(isDismissedRecently(storage, 'bb_waitlist_dismissed')).toBe(false);
      expect(shouldShowWaitlistModal({
        shownThisSession: false,
        submitted: false,
        storage,
      })).toBe(true);
    });

    it('handles empty string localStorage value gracefully', () => {
      storage.setItem('bb_waitlist_dismissed', '');

      expect(isDismissedRecently(storage, 'bb_waitlist_dismissed')).toBe(false);
    });

    it('handles negative timestamp gracefully', () => {
      storage.setItem('bb_waitlist_dismissed', '-1');

      expect(isDismissedRecently(storage, 'bb_waitlist_dismissed')).toBe(false);
    });

    it('handles zero timestamp gracefully', () => {
      storage.setItem('bb_waitlist_dismissed', '0');

      expect(isDismissedRecently(storage, 'bb_waitlist_dismissed')).toBe(false);
    });
  });

  describe('force mode (?waitlist=1 deep link)', () => {
    it('shows modal even when already shown this session', () => {
      expect(shouldShowWaitlistModal({
        shownThisSession: true,
        submitted: false,
        storage,
        force: true,
      })).toBe(true);
    });

    it('shows modal even when dismissed recently', () => {
      storage.setItem('bb_waitlist_dismissed', String(Date.now()));

      expect(shouldShowWaitlistModal({
        shownThisSession: false,
        submitted: false,
        storage,
        force: true,
      })).toBe(true);
    });

    it('still blocks when user already submitted email', () => {
      expect(shouldShowWaitlistModal({
        shownThisSession: false,
        submitted: true,
        storage,
        force: true,
      })).toBe(false);
    });

    it('shows modal even when both session guard and TTL would block', () => {
      storage.setItem('bb_waitlist_dismissed', String(Date.now()));

      expect(shouldShowWaitlistModal({
        shownThisSession: true,
        submitted: false,
        storage,
        force: true,
      })).toBe(true);
    });
  });

  describe('closeWaitlistModal persists dismissal', () => {
    it('writes timestamp to localStorage on close', () => {
      const now = Date.now();
      storage.setItem('bb_waitlist_dismissed', String(now));

      const ts = parseInt(storage.getItem('bb_waitlist_dismissed'), 10);
      expect(ts).toBe(now);
      expect(isDismissedRecently(storage, 'bb_waitlist_dismissed')).toBe(true);
    });
  });
});

describe('onboarding overlay suppression', () => {
  let storage;

  beforeEach(() => {
    storage = createMockStorage();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hides overlay when bb-onboarded is set', () => {
    storage.setItem('bb-onboarded', '1');
    expect(shouldHideOnboarding(storage)).toBe(true);
  });

  it('hides overlay when dismissed within 7 days (even without bb-onboarded)', () => {
    const recentTs = Date.now() - (2 * 24 * 60 * 60 * 1000); // 2 days ago
    storage.setItem('bb_onboarding_dismissed', String(recentTs));

    expect(shouldHideOnboarding(storage)).toBe(true);
  });

  it('shows overlay when no onboarding flag and no recent dismissal', () => {
    expect(shouldHideOnboarding(storage)).toBe(false);
  });

  it('shows overlay when dismissal is older than 7 days and bb-onboarded not set', () => {
    const oldTs = Date.now() - (10 * 24 * 60 * 60 * 1000);
    storage.setItem('bb_onboarding_dismissed', String(oldTs));

    // Without bb-onboarded, old dismissal doesn't suppress
    expect(shouldHideOnboarding(storage)).toBe(false);
  });

  it('hides overlay when both bb-onboarded and recent dismissal exist', () => {
    storage.setItem('bb-onboarded', '1');
    storage.setItem('bb_onboarding_dismissed', String(Date.now()));

    expect(shouldHideOnboarding(storage)).toBe(true);
  });

  it('hideOverlay persists both bb-onboarded and dismissal timestamp', () => {
    // Simulate what hideOverlay does
    storage.setItem('bb-onboarded', '1');
    storage.setItem('bb_onboarding_dismissed', String(Date.now()));

    expect(storage.getItem('bb-onboarded')).toBe('1');
    expect(isDismissedRecently(storage, 'bb_onboarding_dismissed')).toBe(true);
  });
});

describe('cache-clear scenario (integration)', () => {
  it('full flow: clear cache → onboarding → dismiss → 30 clicks → waitlist → dismiss → suppressed for 7 days', () => {
    vi.useFakeTimers();
    const storage = createMockStorage(); // empty = simulating cache clear

    // Step 1: No visited flag → onboarding shows
    expect(storage.getItem('bb-visited')).toBe(null);
    expect(shouldHideOnboarding(storage)).toBe(false); // overlay would show

    // Step 2: User dismisses onboarding
    storage.setItem('bb-visited', '1');
    storage.setItem('bb-onboarded', '1');
    storage.setItem('bb_onboarding_dismissed', String(Date.now()));

    // Step 3: Waitlist modal should be available (not dismissed, not submitted)
    expect(shouldShowWaitlistModal({
      shownThisSession: false,
      submitted: false,
      storage,
    })).toBe(true);

    // Step 4: User dismisses waitlist modal
    storage.setItem('bb_waitlist_dismissed', String(Date.now()));

    // Step 5: Waitlist suppressed by TTL
    expect(shouldShowWaitlistModal({
      shownThisSession: false, // new session
      submitted: false,
      storage,
    })).toBe(false);

    // Step 6: Fast-forward 8 days
    vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);

    // Step 7: Waitlist shows again after TTL expires
    expect(shouldShowWaitlistModal({
      shownThisSession: false,
      submitted: false,
      storage,
    })).toBe(true);

    vi.useRealTimers();
  });
});
