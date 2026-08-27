import type { Controller } from ".";

declare global {
  interface HTMLMediaElement {
    vsc?: Controller;
  }
}
