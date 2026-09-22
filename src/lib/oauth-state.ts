/** OAuth CSRF state from clients (pnk-mail uses HMAC: `nonce.sig` with dots). */
export function isPassableOAuthState(state: string | null | undefined): boolean {
  if (!state) return false;
  // Allow base64url + dots (signed payloads); reject spaces / URL metacharacters
  return (
    state.length >= 8 &&
    state.length <= 512 &&
    /^[A-Za-z0-9._~-]{8,512}$/.test(state)
  );
}
