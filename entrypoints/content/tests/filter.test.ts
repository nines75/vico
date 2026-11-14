import { describe, it, expect, vi } from "vitest";
import { isMatch, parsePattern, shouldEnable } from "../filter";
import type { Rule, Settings } from "@/types/settings.types";
import { defaultSettings } from "@/utils/config";
import type { SetOptional } from "type-fest";

function mockSettings(
  rules: SetOptional<Rule, "id" | "enabled">[],
  mode: Settings["filter"]["mode"] = "blacklist",
): Settings {
  return {
    ...defaultSettings,
    filter: {
      mode,
      rules: rules.map((rule) => ({
        id: "1",
        enabled: true,
        ...rule,
      })),
    },
  };
}

vi.stubGlobal("location", {
  hostname: "example.com",
  href: "https://example.com/foo",
});

describe(shouldEnable.name, () => {
  describe("blacklist mode", () => {
    it("should return false when a rule matches", () => {
      expect(shouldEnable(mockSettings([{ pattern: "example.com" }]))).toBe(
        false,
      );
    });

    it("should return true when no rules match", () => {
      expect(shouldEnable(mockSettings([{ pattern: "example2.com" }]))).toBe(
        true,
      );
    });
  });

  describe("whitelist mode", () => {
    it("should return true when a rule matches", () => {
      expect(
        shouldEnable(mockSettings([{ pattern: "example.com" }], "whitelist")),
      ).toBe(true);
    });

    it("should return false when no rules match", () => {
      expect(
        shouldEnable(mockSettings([{ pattern: "example2.com" }], "whitelist")),
      ).toBe(false);
    });
  });
});

describe(isMatch.name, () => {
  describe("string pattern", () => {
    it("should return true when a pattern matches", () => {
      expect(isMatch(mockSettings([{ pattern: "example.com" }]))).toBe(true);
    });

    it("should return false when no patterns match", () => {
      expect(isMatch(mockSettings([{ pattern: "example2.com" }]))).toBe(false);
    });
  });

  describe("regex pattern", () => {
    it("should return true when a pattern matches", () => {
      expect(
        isMatch(mockSettings([{ pattern: "/^https://example.com/foo/" }])),
      ).toBe(true);
    });

    it("should return false when no patterns match", () => {
      expect(
        isMatch(mockSettings([{ pattern: "/^https://example.com/bar/" }])),
      ).toBe(false);
    });
  });

  it("should ignore disabled rules", () => {
    expect(
      isMatch(mockSettings([{ pattern: "example.com", enabled: false }])),
    ).toBe(false);
  });

  it("should ignore invalid regex patterns", () => {
    expect(
      isMatch(mockSettings([{ pattern: "/^(https://example.com/foo/" }])),
    ).toBe(false);
  });
});

describe(parsePattern.name, () => {
  it("should parse a string pattern", () => {
    expect(parsePattern("example.com")).toEqual({
      type: "valid",
      pattern: "example.com",
    });
  });

  describe("regex pattern", () => {
    it("should parse a valid regex pattern", () => {
      expect(parsePattern("/^https://example.com/foo/")).toEqual({
        type: "valid",
        pattern: /^https:\/\/example.com\/foo/,
      });
    });

    it("should parse a valid regex pattern with valid flags", () => {
      expect(parsePattern("/^https://example.com/foo/i")).toEqual({
        type: "valid",
        pattern: /^https:\/\/example.com\/foo/i,
      });
    });

    it("should parse an invalid regex pattern", () => {
      expect(parsePattern("/^(https://example.com/foo/")).toEqual({
        type: "invalid",
      });
    });

    it("should parse a valid regex pattern with invalid flags", () => {
      expect(parsePattern("/^https://example.com/foo/g")).toEqual({
        type: "invalid",
      });
    });
  });
});
