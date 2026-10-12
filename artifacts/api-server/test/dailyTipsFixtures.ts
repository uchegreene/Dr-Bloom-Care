/** Test-bundle aliases only. These are never imported by the real API. */
export const getAuth = (req: { header(name: string): string | undefined }) => ({ userId: req.header("x-fixture-user") ?? null });
export const clerkClient = { users: { getUser: async (id: string) => ({
  id, primaryEmailAddressId: "fixture-email",
  emailAddresses: [{ id: "fixture-email", emailAddress: `${id.toLowerCase()}@example.com`,
    verification: { status: id.includes("_unverified_") ? "unverified" : "verified" } }],
}) } };
export const modelInputs: string[] = [];
export const ai = { models: { generateContent: async ({ contents }: { contents: string }) => {
  modelInputs.push(contents);
  return { text: JSON.stringify({ title: "Shared health education", body: "Keep a short list of questions for your next appointment. General education is not a diagnosis. Discuss individual concerns with your qualified care professional." }) };
} } };
