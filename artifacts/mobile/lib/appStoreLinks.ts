export function validatedStoreLink(value: string | undefined, store: "apple" | "google"): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (store === "apple") {
      if (url.hostname !== "apps.apple.com" || !/\/app\/(?:[^/]+\/)?id\d+\/?$/.test(url.pathname) || /\/id982107779\/?$/.test(url.pathname)) return null;
    } else if (url.hostname !== "play.google.com" || url.pathname !== "/store/apps/details" ||
      !url.searchParams.get("id") || url.searchParams.get("id") === "host.exp.exponent") return null;
    return url.href;
  } catch { return null; }
}
