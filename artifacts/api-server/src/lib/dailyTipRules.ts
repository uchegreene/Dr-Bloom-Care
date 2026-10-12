export type TipAudience = "cycle" | "pregnancy";
export type TipState = "queued" | "generating" | "draft" | "approved" | "rejected" | "published" | "error";
export const TIP_MODEL = "gemini-3.8-flash";
export const TIP_SCHEDULE = "09:00 Africa/Lagos";
export const TIP_SOURCES = [
  { label: "NHS women's health", url: "https://www.nhs.uk/womens-health/" },
  { label: "NHS pregnancy", url: "https://www.nhs.uk/pregnancy/" },
  { label: "ACOG patient education", url: "https://www.acog.org/womens-health" },
];
export function nigeriaDate(now = new Date()): string {
  return new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10);
}
export function tipDateOffset(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10);
}
export function publicationTime(date: string): Date {
  return new Date(`${date}T08:00:00.000Z`);
}
export function eligibleTipPlan(account: {
  femaleOnlyConfirmed: boolean; subscriptionStatus: string; subscriptionPlan: string | null;
  subscriptionExpiresAt: Date | null;
}, now = new Date()): TipAudience | null {
  return account.femaleOnlyConfirmed && account.subscriptionStatus === "active" &&
    account.subscriptionExpiresAt && account.subscriptionExpiresAt > now &&
    (account.subscriptionPlan === "cycle" || account.subscriptionPlan === "pregnancy")
    ? account.subscriptionPlan : null;
}
export function validateTipText(title: string, body: string) {
  if (!title.trim() || title.trim().length > 180 || !body.trim() || body.trim().length > 5000) {
    throw new Error("Enter a title of 1–180 characters and a body of 1–5,000 characters.");
  }
}
export function draftPrompt(audience: TipAudience, date: string): string {
  return `Write one general health-education draft for Dr Bloom Care's ${audience === "pregnancy" ? "pregnancy" : "menstrual-cycle and reproductive wellbeing"} members for ${date}.
Return JSON only: {"title":"short title","body":"120–220 words"}. Use accessible, respectful English and no emojis.
This is educational material requiring a human medical professional's approval, not a medical consultation.
Do not diagnose, prescribe, recommend medication names or dosages, herbal remedies, supplements, changing treatment, or delaying care.
Do not invent facts, citations, statistics, credentials, personal experiences, or claim to be a doctor. Never mention any individual patient.
Prefer low-risk topics: rest, comfort, preparing questions for appointments, general hygiene, emotional support, balanced meals and clinician-approved gentle activity.
Pregnancy content must not assume a gestational week or individual clinical circumstances. Cycle content must be age-appropriate, non-gratuitous health education.
Add a brief reminder to discuss individual concerns with a qualified clinician. Emergency concerns should go to local emergency care, not wait for this app.
Vary the topic by day. Do not add links; the application provides fixed NHS and ACOG reference links for the human reviewer to verify.`;
}
