import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/svelte";
import { afterEach } from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia synchronously for modules that access it at import time
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});

// Mock HTMLDialogElement.showModal/close for Flowbite Dialog in jsdom
if (window.HTMLDialogElement) {
  if (!window.HTMLDialogElement.prototype.showModal) {
    Object.defineProperty(window.HTMLDialogElement.prototype, "showModal", {
      value: () => {},
      writable: true,
    });
  }
  if (!window.HTMLDialogElement.prototype.close) {
    Object.defineProperty(window.HTMLDialogElement.prototype, "close", {
      value: () => {},
      writable: true,
    });
  }
} else {
  // Fallback for environments without HTMLDialogElement in jsdom:
  // provide no-op showModal/close on HTMLElement to avoid test errors.
  // This is sufficient for Flowbite Dialog usage in unit tests.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const HTMLElementProto: any = HTMLElement.prototype;
  if (!HTMLElementProto.showModal) {
    Object.defineProperty(HTMLElementProto, "showModal", {
      value: () => {},
      writable: true,
    });
  }
  if (!HTMLElementProto.close) {
    Object.defineProperty(HTMLElementProto, "close", {
      value: () => {},
      writable: true,
    });
  }
}

// Mock Element.prototype.animate for Svelte transitions in jsdom
if (!Element.prototype.animate) {
  Element.prototype.animate = () =>
    ({
      finished: Promise.resolve(),
      cancel: () => {},
      play: () => {},
      pause: () => {},
      reverse: () => {},
      finish: () => {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
}
