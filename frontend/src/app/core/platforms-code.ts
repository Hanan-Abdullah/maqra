// Registers the Platforms Code web components the app uses (@platformscode/core).
// Each component is imported on its own, so only what is used ends up in the build.
// Components are added here as the pages start using them.
import { defineCustomElement as defineButton } from '@platformscode/core/components/dga-button.js';

export function registerPlatformsCode(): void {
  defineButton();
}
