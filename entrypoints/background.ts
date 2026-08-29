import { browser, defineBackground } from "#imports";
import { catchAsync } from "@/utils/util";

export default defineBackground(() => {
  browser.browserAction.onClicked.addListener(
    catchAsync(async () => {
      await browser.runtime.openOptionsPage();
    }),
  );
});
