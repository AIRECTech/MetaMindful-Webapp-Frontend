const CLIP_SESSION_KEY = 'mm_from_clip';

/**
 * Call this when the user lands on /clip to mark the session as coming from an App Clip invocation.
 */
export function markAsClipSession(): void {
  sessionStorage.setItem(CLIP_SESSION_KEY, '1');
}

/**
 * Returns true if the user arrived via the /clip URL in this browser session.
 */
export function isClipSession(): boolean {
  return sessionStorage.getItem(CLIP_SESSION_KEY) === '1';
}

/**
 * Clear the clip session flag (e.g. if user signs up / logs in).
 */
export function clearClipSession(): void {
  sessionStorage.removeItem(CLIP_SESSION_KEY);
}
