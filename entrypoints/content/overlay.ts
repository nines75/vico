import { createShadowRootUi, type ContentScriptContext } from "#imports";
import debounce from "debounce";

export async function setupOverlay(ctx: ContentScriptContext) {
  const elements = document.querySelectorAll("vico-overlay");
  for (const element of elements) {
    element.remove();
  }

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

  window.addEventListener("message", (event) => {
    const data = event.data as { type: string; message: string };
    if (data.type === "vico-show-overlay") {
      showOverlay(data.message);
    }
  });
}

const showOverlay = (message: string) => {
  const host = document.querySelector("vico-overlay");
  const overlay = host?.shadowRoot?.querySelector(".overlay");

  if (overlay instanceof HTMLElement) {
    overlay.textContent = message;
    overlay.classList.add("visible");

    hideOverlay(overlay);
  }
};

const hideOverlay = debounce((host: HTMLElement) => {
  host.classList.remove("visible");
}, 2000);
