import { defineContentScript } from "#imports";
import { loadSettings } from "@/utils/storage";
import "./overlay.css";
import { setupOverlay } from "./overlay";
import { setupKeybindings } from "./keybinding";
import { shouldEnable } from "./filter";

export default defineContentScript({
  allFrames: true, // 埋め込み動画に対応するために全てのフレームで実行する
  cssInjectionMode: "ui", // createShadowRootUi()を使うために必要
  matches: ["http://*/*", "https://*/*"],
  async main(ctx) {
    const settings = await loadSettings();
    if (!settings.enabled) return;

    // iframeの内側にオーバーレイを表示すると見ずらいため、
    // 最上位のウインドウに対してのみオーバーレイをセットアップし、
    // 全ての速度変更通知を最上位のウインドウに集約する。
    // また、このウインドウがフィルタリング対象であっても、
    // 別のフィルタリング対象でないウインドウの速度変更通知を表示させる可能性があるため、
    // この処理はフィルター設定に関わらず必ず実行する。
    if (globalThis.self === globalThis.top) {
      setupOverlay(ctx);
    }

    if (!shouldEnable(settings)) return;

    if (document.readyState === "complete") {
      setupKeybindings(settings);

      return;
    }

    document.addEventListener("readystatechange", () => {
      if (document.readyState === "complete") setupKeybindings(settings);
    });
  },
});
