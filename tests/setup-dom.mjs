// Test-environment bootstrap for DOM/client tests: registers the stylesheet
// stub, a happy-dom global window/document, and defensive browser-API stubs.
// Loaded via `--import ./tests/setup-dom.mjs` after tsx, so the stylesheet
// stub sits in front of tsx in the resolve chain.
import { register } from 'node:module';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

register('./css-loader.mjs', import.meta.url);
GlobalRegistrator.register();

// The test files compile JSX to the classic runtime (React.createElement);
// expose React globally so they resolve it without per-file imports.
const reactModule = await import('react');
globalThis.React = reactModule.default ?? reactModule;

// The plugin's locale resolves zh from the document language; pin it so
// assertions on zh strings stay stable regardless of host defaults.
document.documentElement.setAttribute('lang', 'zh-CN');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Browser APIs happy-dom does not implement (or implements partially) that
// the reading view touches at mount.
if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}
if (typeof Element.prototype.scrollTo !== 'function') {
  Element.prototype.scrollTo = function scrollTo() {};
}
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
