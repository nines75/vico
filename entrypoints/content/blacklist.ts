import type { Settings } from "@/types/settings.types";

export function isBlacklisted(settings: Settings) {
  for (const line of settings.blacklist.split("\n")) {
    if (line === "") continue;

    const results = /^\/(.*)\/([^/]*)$/.exec(line);

    const regexStr = results?.[1];
    const flags = results?.[2];

    let regex: RegExp | undefined;
    if (regexStr !== undefined && flags !== undefined) {
      if (!/^[isuvm]*$/.test(flags)) continue;

      try {
        regex = new RegExp(regexStr, flags);
      } catch {
        continue;
      }
    }

    if (regex === undefined) {
      if (line === location.hostname) return true;
    } else {
      if (regex.test(location.href)) return true;
    }
  }

  return false;
}
