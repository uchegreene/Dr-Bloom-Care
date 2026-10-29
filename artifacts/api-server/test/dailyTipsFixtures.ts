/** Test-bundle aliases only. These are never imported by the real API. */
export const getAuth = (req: { header(name: string): string | undefined }) => ({ userId: req.header("x-fixture-user") ?? null });
const staffIdentities = new Map<string, string>();
const privateProfiles = new Map<string, unknown>();
export const removedStaffIdentities: string[] = [];
export const clerkClient = { users: {
getUserList: async ({ emailAddress }: { emailAddress: string[] }) => ({
  data: [...staffIdentities].filter(([, email]) => emailAddress.includes(email)).map(([id]) => ({ id })),
}),
createUser: async ({ emailAddress, password }: { emailAddress: string[]; password: string }) => {
  if (password.length < 32) throw new Error("Expected a unique non-shared random credential");
  const id = `TEST_created_staff_${staffIdentities.size + 1}`;
  staffIdentities.set(id, emailAddress[0]);
  return { id };
},
deleteUser: async (id: string) => { staffIdentities.delete(id); removedStaffIdentities.push(id); },
updateUserMetadata: async (id: string, data: { privateMetadata: { bloomStaffProfile: unknown } }) => {
  privateProfiles.set(id, data.privateMetadata.bloomStaffProfile);
  return { id };
},
getUser: async (id: string) => ({
  id, primaryEmailAddressId: "fixture-email",
  privateMetadata: { bloomStaffProfile: privateProfiles.get(id) },
  emailAddresses: [{ id: "fixture-email", emailAddress: staffIdentities.get(id) ?? `${id.toLowerCase()}@example.com`,
    verification: { status: id.includes("_unverified_") ? "unverified" : "verified" } }],
}) } };
export const modelInputs: string[] = [];
export const ai = { models: { generateContent: async ({ contents }: { contents: string }) => {
  modelInputs.push(contents);
  return { text: JSON.stringify({ title: "Shared health education", body: "Keep a short list of questions for your next appointment. General education is not a diagnosis. Discuss individual concerns with your qualified care professional." }) };
} } };
