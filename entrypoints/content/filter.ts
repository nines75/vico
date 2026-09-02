import type { Settings } from "@/types/settings.types";
import { isString } from "@/utils/util";

export function shouldEnable(settings: Settings) {
  const mode = settings.filter.mode;

  return (isMatch(settings) ? "whitelist" : "blacklist") === mode;
}

function isMatch(settings: Settings) {
  for (const rule of settings.filter.rules) {
    if (!rule.enabled || rule.pattern === "") continue;

    const result = parsePattern(rule.pattern);
    if (result.type === "invalid") continue;

    const pattern = result.pattern;
    if (isString(pattern)) {
      if (pattern === location.hostname) return true;
    } else {
      if (pattern.test(location.href)) return true;
    }
  }

  return false;
}

export function parsePattern(
  pattern: string,
): { type: "valid"; pattern: string | RegExp } | { type: "invalid" } {
  const results = /^\/(.*)\/([^/]*)$/.exec(pattern);

  const regexStr = results?.[1];
  const flags = results?.[2];

  if (regexStr !== undefined && flags !== undefined) {
    if (!/^[isuvm]*$/.test(flags)) return { type: "invalid" };

    try {
      return { type: "valid", pattern: new RegExp(regexStr, flags) };
    } catch {
      return { type: "invalid" };
    }
  }

  return { type: "valid", pattern };
}
