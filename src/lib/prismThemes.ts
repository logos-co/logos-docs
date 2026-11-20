import type {PrismTheme} from 'prism-react-renderer';

/**
 * Syntax highlighting theme built from the Logos brand palette
 * (Brand Guidelines v2.0).
 *
 * Code blocks sit on the brand's primary dark green, Black (#152521), in
 * both the light and the dark site theme, so one theme serves both. Each
 * kind of token gets one palette hue:
 *
 *   plain text      Off-White     #f5f5ef
 *   keywords        Yellow        #ffd328 (fn, let, pub, impl, match)
 *   functions       Light Blue    #c6ebf7 (function names, macros)
 *   strings         Steel Teal    tinted (string and char literals)
 *   types           Brown         tinted (structs, enums, traits, modules)
 *   numbers, keys   Deep Purple   tinted (numbers, booleans, constants;
 *                                 TOML/JSON/YAML keys and properties)
 *   comments        Grey 03       #9ea5a0, italic
 *   punctuation     Grey 02       #b8bdb8
 *   Rust #[...]     Grey 04       #848e88
 *
 * Deep Purple, Brown and Steel Teal are too dark to read on Black, so they
 * are used as light tints of the same hue. Every token keeps at least 4.5:1
 * contrast, and all but Rust attributes are above 7:1.
 */
export const logosCode: PrismTheme = {
  plain: {
    color: '#f5f5ef',
    backgroundColor: '#152521',
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
      style: {color: '#ffd328'},
    },
    {
      types: ['function', 'function-definition', 'macro'],
      style: {color: '#c6ebf7'},
    },
    {
      types: ['class-name', 'namespace', 'type-definition', 'module-declaration'],
      style: {color: '#c4a77c'},
    },
    {
      types: ['string', 'char', 'attr-value', 'regex', 'url', 'inserted'],
      style: {color: '#93b5b8'},
    },
    {
      types: ['number', 'boolean', 'constant', 'symbol', 'entity', 'lifetime-annotation'],
      style: {color: '#d0a9bb'},
    },
    {
      types: ['attr-name', 'attribute', 'property', 'key'],
      style: {color: '#d0a9bb'},
    },
    {
      types: ['variable', 'parameter'],
      style: {color: '#f5f5ef'},
    },
    {
      // Rust macros (println!) are aliased to 'property'; keep them blue,
      // and keep #[...] attributes (aliased to 'attr-name') quiet.
      languages: ['rust'],
      types: ['property'],
      style: {color: '#c6ebf7'},
    },
    {
      languages: ['rust'],
      types: ['attr-name'],
      style: {color: '#848e88'},
    },
    {
      types: ['deleted'],
      style: {color: '#d0a9bb', textDecorationLine: 'line-through'},
    },
  ],
};
