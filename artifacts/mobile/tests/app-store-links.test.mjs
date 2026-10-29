import test from "node:test";
import assert from "node:assert/strict";
import { validatedStoreLink } from "../lib/appStoreLinks.ts";

test("accepts real HTTPS store-listing URL formats", () => {
  assert.equal(validatedStoreLink("https://apps.apple.com/us/app/example/id1234567890", "apple"), "https://apps.apple.com/us/app/example/id1234567890");
  assert.equal(validatedStoreLink("https://apps.apple.com/app/id1234567890", "apple"), "https://apps.apple.com/app/id1234567890");
  assert.equal(validatedStoreLink("https://play.google.com/store/apps/details?id=com.example.app", "google"), "https://play.google.com/store/apps/details?id=com.example.app");
});

test("missing links and non-store addresses do not become fake download buttons", () => {
  for (const input of [undefined, "", "invalid", "http://apps.apple.com/app/id1234567890", "https://attacker.test/app/id1234567890"]) {
    assert.equal(validatedStoreLink(input, "apple"), null);
  }
  assert.equal(validatedStoreLink("https://play.google.com/store/apps/details", "google"), null);
  assert.equal(validatedStoreLink("https://play.google.com.attacker.test/store/apps/details?id=com.example.app", "google"), null);
});

test("never offers Expo Go as the Dr Bloom Care store download", () => {
  assert.equal(validatedStoreLink("https://apps.apple.com/app/id982107779", "apple"), null);
  assert.equal(validatedStoreLink("https://apps.apple.com/us/app/expo-go/id982107779", "apple"), null);
  assert.equal(validatedStoreLink("https://play.google.com/store/apps/details?id=host.exp.exponent", "google"), null);
});
