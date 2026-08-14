export const COOKIE_OPTIONS = "Domain=.metamindful.ai; Path=/; Secure; SameSite=Lax";

export function setMmSidCookie(sid: string) {
  document.cookie = `mm_sid=${sid}; ${COOKIE_OPTIONS}`;
}

export function setMmHasChatCookie() {
  document.cookie = `mm_has_chat=1; ${COOKIE_OPTIONS}`;
}

export function setMmAuthCookie() {
  document.cookie = `mm_auth=1; ${COOKIE_OPTIONS}`;
}

export function clearMmAuthCookie() {
  document.cookie = `mm_auth=; expires=Thu, 01 Jan 1970 00:00:00 GMT; ${COOKIE_OPTIONS}`;
}

