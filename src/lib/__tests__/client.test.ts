import { afterEach, describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));
const { activeApiKey, jevProvider, looksLikeKey } = await import("@/lib/jev/client");

describe("API key detection", () => {
  test("empty or missing → offline", () => {
    expect(looksLikeKey(undefined)).toBe(false);
    expect(looksLikeKey("")).toBe(false);
    expect(looksLikeKey("   ")).toBe(false);
  });
  test("copied placeholders → offline", () => {
    expect(looksLikeKey("sk-...")).toBe(false);
    expect(looksLikeKey("your-api-key-here")).toBe(false);
    expect(looksLikeKey("<TYPESAFE_API_KEY>")).toBe(false);
  });
  test("a real-looking key → online", () => {
    expect(looksLikeKey("sk-live-8f2c1a9b7d6e5f40")).toBe(true);
  });
});

describe("Jev provider selection", () => {
  const ORIGINAL = { ...process.env };
  afterEach(() => {
    for (const k of ["JEV_PROVIDER", "TYPESAFE_API_KEY", "HACKCLUB_API_KEY"]) delete process.env[k];
    Object.assign(process.env, ORIGINAL);
  });

  test("defaults to typesafe", () => expect(jevProvider()).toBe("typesafe"));
  test("unknown value falls back to typesafe", () => {
    process.env.JEV_PROVIDER = "bogus";
    expect(jevProvider()).toBe("typesafe");
  });
  test("hackclub selected explicitly", () => {
    process.env.JEV_PROVIDER = "hackclub";
    expect(jevProvider()).toBe("hackclub");
  });
  test("typesafe reads TYPESAFE_API_KEY", () => {
    process.env.TYPESAFE_API_KEY = "sk-live-8f2c1a9b7d6e5f40";
    process.env.HACKCLUB_API_KEY = "should-be-ignored-1234";
    expect(activeApiKey()).toBe("sk-live-8f2c1a9b7d6e5f40");
  });
  test("hackclub reads HACKCLUB_API_KEY", () => {
    process.env.JEV_PROVIDER = "hackclub";
    process.env.TYPESAFE_API_KEY = "should-be-ignored-1234";
    process.env.HACKCLUB_API_KEY = "hc-live-9d8c7b6a5f4e3d21";
    expect(activeApiKey()).toBe("hc-live-9d8c7b6a5f4e3d21");
  });
});
