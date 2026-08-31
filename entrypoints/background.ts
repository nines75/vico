import { browser, defineBackground } from "#imports";
import { catchAsync } from "@/utils/util";

export default defineBackground(() => {
  const isMv2 = browser.runtime.getManifest().manifest_version === 2;

  (isMv2 ? browser.browserAction : browser.action).onClicked.addListener(
    catchAsync(async () => {
      await browser.runtime.openOptionsPage();
    }),
  );
});
