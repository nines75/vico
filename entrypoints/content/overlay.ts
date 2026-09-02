import { createShadowRootUi, type ContentScriptContext } from "#imports";
import { catchAsync } from "@/utils/util";
import debounce from "debounce";

export function setupOverlay(ctx: ContentScriptContext) {
  globalThis.addEventListener(
    "message",
    catchAsync(async (event) => {
      const data = event.data as { type?: string; message?: string };

      if (data.type === "vico-show-overlay" && data.message !== undefined) {
        const host = await mountOverlay(ctx);
        const overlay = host.shadowRoot?.querySelector(".overlay");

        if (overlay instanceof HTMLElement) {
          overlay.textContent = data.message;
          overlay.classList.add("visible");

          hideOverlay(overlay);
        }
      }
    }),
  );
}

async function mountOverlay(ctx: ContentScriptContext) {
  const host = document.querySelector("vico-overlay");
  if (host !== null) return host;

  const ui = await createShadowRootUi(ctx, {
    name: "vico-overlay",
    position: "inline",
    anchor: "body",
    onMount(container) {
      const div = document.createElement("div");
      div.className = "overlay";

      container.append(div);
    },
  });
  ui.mount();

  return ui.shadowHost;
}

const hideOverlay = debounce((overlay: HTMLElement) => {
  overlay.classList.remove("visible");
}, 2000);
