/**
 * Swizzled from @docusaurus/theme-classic (eject) to register fence-name
 * aliases on top of `prism.additionalLanguages`, so that code blocks tagged
 * with a name Prism doesn't know still get highlighted.
 */
import siteConfig from '@generated/docusaurus.config';
import type * as PrismNamespace from 'prismjs';

// Fence names used in the docs (including mirrored reference pages, which
// can't be edited here) mapped to the Prism grammar that fits them.
const LANGUAGE_ALIASES: Record<string, string> = {
  conf: 'ini', // nix.conf and similar key = value files
  rep: 'cpp', // Qt Remote Objects .rep interface files
};

export default function prismIncludeLanguages(
  PrismObject: typeof PrismNamespace,
): void {
  const {
    themeConfig: {prism},
  } = siteConfig;
  const {additionalLanguages} = prism as {additionalLanguages: string[]};

  // Prism components work on the Prism instance on the window, while
  // prism-react-renderer uses its own instance. Mount it temporarily.
  const PrismBefore = globalThis.Prism;
  globalThis.Prism = PrismObject;

  additionalLanguages.forEach((lang) => {
    if (lang === 'php') {
      // eslint-disable-next-line global-require
      require('prismjs/components/prism-markup-templating.js');
    }
    // eslint-disable-next-line global-require, import/no-dynamic-require
    require(`prismjs/components/prism-${lang}`);
  });

  Object.entries(LANGUAGE_ALIASES).forEach(([alias, target]) => {
    if (PrismObject.languages[target]) {
      PrismObject.languages[alias] = PrismObject.languages[target];
    }
  });

  delete (globalThis as {Prism?: unknown}).Prism;
  if (typeof PrismBefore !== 'undefined') {
    globalThis.Prism = PrismObject;
  }
}
