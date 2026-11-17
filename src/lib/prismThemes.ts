import type {PrismTheme} from 'prism-react-renderer';

/**
 * Syntax highlighting themes built from the Logos brand palette
 * (Brand Guidelines v2.0). Accent hues are darkened (light theme) or used
 * at full lightness (dark theme) so every token keeps at least 4.5:1
 * contrast against its code-block background.
 */

// Light: Black text on a Grey 01 tint.
export const logosLight: PrismTheme = {
  plain: {
    color: '#152521',
    backgroundColor: '#ebece6',
  },
  styles: [
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: {color: '#5b6762', fontStyle: 'italic'},
    },
    {
      types: ['punctuation', 'operator'],
      style: {color: '#475651'},
    },
    {
      types: ['keyword', 'atrule', 'important', 'selector', 'tag', 'builtin'],
      style: {color: '#48373f'},
    },
    {
      types: ['string', 'char', 'attr-value', 'regex', 'url', 'inserted'],
      style: {color: '#3f5a5d'},
    },
    {
      types: ['number', 'boolean', 'constant', 'symbol', 'entity'],
      style: {color: '#6e5530'},
    },
    {
      types: ['function', 'class-name', 'attr-name', 'property'],
      style: {color: '#152521', fontWeight: '500'},
    },
    {
      types: ['variable', 'parameter'],
      style: {color: '#2b3a36'},
    },
    {
      types: ['deleted'],
      style: {color: '#48373f', textDecorationLine: 'line-through'},
    },
  ],
};

// Dark: Off-white text on the field guide's dark fog.
export const logosDark: PrismTheme = {
  plain: {
    color: '#f0efe7',
    backgroundColor: '#1a2723',
  },
  styles: [
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: {color: '#9ea5a0', fontStyle: 'italic'},
    },
    {
      types: ['punctuation', 'operator'],
      style: {color: '#b8bdb8'},
    },
    {
      types: ['keyword', 'atrule', 'important', 'selector', 'tag', 'builtin'],
      style: {color: '#c6ebf7'},
    },
    {
      types: ['string', 'char', 'attr-value', 'regex', 'url', 'inserted'],
      style: {color: '#e2e0c9'},
    },
    {
      types: ['number', 'boolean', 'constant', 'symbol', 'entity'],
      style: {color: '#ffd328'},
    },
    {
      types: ['function', 'class-name', 'attr-name', 'property'],
      style: {color: '#f5f5ef', fontWeight: '500'},
    },
    {
      types: ['variable', 'parameter'],
      style: {color: '#dbddd7'},
    },
    {
      types: ['deleted'],
      style: {color: '#d4b8c4', textDecorationLine: 'line-through'},
    },
  ],
};
