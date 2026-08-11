export const COOKIE_OPTIONS = "Domain=.metamindful.ai; Path=/; Secure; SameSite=Lax";

export function setMmSidCookie(sid: string) {
  document.cookie = `mm_sid=${sid}; ${COOKIE_OPTIONS}`;
}

export function setMmHasChatCookie() {
  document.cookie = `mm_has_chat=1; ${COOKIE_OPTIONS}`;
}
