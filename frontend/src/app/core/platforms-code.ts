// Registers the Platforms Code web components the app uses (@platformscode/core).
// Each component is imported on its own, so only what is used ends up in the build.
// Add a component here when a page starts using it.
// setAssetPath comes from the library's shared runtime chunk: importing it from '@platformscode/core/components'
// would pull every component into the bundle (about 1 MB, charts included). The chunk name is tied to the pinned
// version (0.0.53); after an upgrade, find the file under dist/components that exports `setAssetPath as s`.
import { s as setAssetPath } from '@platformscode/core/dist/components/p-BfuyVjJ2.js';
import { defineCustomElement as defineButton } from '@platformscode/core/components/dga-button.js';
import { defineCustomElement as defineIcon } from '@platformscode/core/components/dga-icon.js';
import { defineCustomElement as defineSecondNav } from '@platformscode/core/components/dga-second-nav-header.js';
import { defineCustomElement as defineSecondNavActions } from '@platformscode/core/components/dga-second-nav-header-actions.js';
import { defineCustomElement as defineSecondNavContent } from '@platformscode/core/components/dga-second-nav-header-content.js';
import { defineCustomElement as defineSecondNavItem } from '@platformscode/core/components/dga-second-nav-header-item.js';
import { defineCustomElement as defineNavHeader } from '@platformscode/core/components/dga-nav-header.js';
import { defineCustomElement as defineNavHeaderMain } from '@platformscode/core/components/dga-nav-header-main.js';
import { defineCustomElement as defineNavHeaderActions } from '@platformscode/core/components/dga-nav-header-actions.js';
import { defineCustomElement as defineTabs } from '@platformscode/core/components/dga-tabs-v2.js';
import { defineCustomElement as defineTab } from '@platformscode/core/components/dga-tab.js';
import { defineCustomElement as defineTableOfContent } from '@platformscode/core/components/dga-table-of-content.js';

export function registerPlatformsCode(): void {
  // Icons are read from assets/svg (copied from @platformscode/icons by angular.json, only the ones we use).
  setAssetPath(document.baseURI);
  [defineButton, defineIcon, defineSecondNav, defineSecondNavActions, defineSecondNavContent, defineSecondNavItem,
    defineNavHeader, defineNavHeaderMain, defineNavHeaderActions, defineTabs, defineTab, defineTableOfContent].forEach((define) => define());
}
