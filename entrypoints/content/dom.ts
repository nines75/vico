export function getMediaElements(): HTMLMediaElement[] {
  const mediaElements: HTMLMediaElement[] = [];

  for (const element of document.querySelectorAll("video,audio")) {
    // Return elements regardless of visibility, as even hidden ones may be used (e.g. Apple Podcasts).
    if (element instanceof HTMLMediaElement) {
      mediaElements.push(element);
    }
  }

  // Some websites (e.g. BBC, Reddit) put media inside shadow roots,
  // so we need to traverse them. However, since most websites don't need this,
  // only traverse when the active element has a shadow DOM to avoid overhead.
  // Although this requires focusing the target element,
  // it behaves the same as media elements in iframes.
  const activeElement = document.activeElement;
  if (activeElement !== null && activeElement.shadowRoot !== null) {
    mediaElements.push(...getShadowDomMedia(activeElement.shadowRoot));
  }

  return mediaElements;
}

function getShadowDomMedia(shadowRoot: ShadowRoot): HTMLMediaElement[] {
  const mediaElements: HTMLMediaElement[] = [];

  const elements = shadowRoot.querySelectorAll("*");
  for (const element of elements) {
    if (element instanceof HTMLMediaElement) mediaElements.push(element);

    // Media elements may be inside nested shadow roots (e.g. BBC), so traverse recursively.
    if (element.shadowRoot !== null) {
      mediaElements.push(...getShadowDomMedia(element.shadowRoot));
    }
  }

  return mediaElements;
}
