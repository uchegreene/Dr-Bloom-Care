import test from "node:test";
import assert from "node:assert/strict";
import { createDemoState, demoReducer } from "../lib/communityDemo.ts";
import { paidAccessAt } from "../lib/subscriptionAccess.ts";

test("sample timeline supports persistent-state actions without changing live membership", () => {
  const initial = createDemoState(0);
  const liked = demoReducer(initial, { type: "like", id: "demo-0" });
  assert.equal(liked.posts[0].likes, initial.posts[0].likes + 1);
  assert.equal(initial.posts[0].liked, false);
  assert.equal(demoReducer(liked, { type: "like", id: "demo-0" }).posts[0].likes, initial.posts[0].likes);
  const posted = demoReducer(liked, { type: "post", text: " Test post ", key: "test" });
  assert.equal(posted.posts[0].text, "Test post");
  const commented = demoReducer(posted, { type: "comment", id: "test", text: " Test comment ", key: "comment" });
  assert.equal(commented.posts[0].comments[0].text, "Test comment");
  const sent = demoReducer(commented, { type: "message", text: " Sample chat ", key: "message" });
  assert.equal(sent.messages.at(-1).text, "Sample chat");
  assert.deepEqual(JSON.parse(JSON.stringify(sent)), sent);
  assert.equal(demoReducer(sent, { type: "post", text: "   ", key: "empty" }), sent);
  assert.notEqual(createDemoState(1).posts[0].text, initial.posts[0].text);
});
test("paid access ends exactly at expiry and cannot be granted by date alone", () => {
  const expires = "2026-10-20T08:00:00.000Z";
  const at = Date.parse(expires);
  assert.equal(paidAccessAt(true, expires, at - 1), true);
  assert.equal(paidAccessAt(true, expires, at), false);
  assert.equal(paidAccessAt(true, expires, at + 1), false);
  assert.equal(paidAccessAt(false, expires, at - 1), false);
  assert.equal(paidAccessAt(true, null, at), false);
  assert.equal(paidAccessAt(true, "invalid", at), false);
});
