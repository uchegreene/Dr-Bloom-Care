export const ADMIN_PORTAL_HOST = "admin.drbloomcare.com";
export function isAdminPortalHost(hostname: string) {
  return hostname.toLowerCase().replace(/\.$/, "") === ADMIN_PORTAL_HOST;
}
