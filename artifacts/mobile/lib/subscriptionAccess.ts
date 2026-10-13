/** Never keep cached paid permissions alive after their actual expiry. */
export function paidAccessAt(serverActive: boolean, expiresAt: string | null, now = Date.now()) {
  return Boolean(serverActive && expiresAt && Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) > now);
}
