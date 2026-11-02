// Shared helpers for the agent-facing UI.

declare global {
  interface Window {
    umami?: {track: (event: string, data?: Record<string, string>) => void};
  }
}

// Umami is already loaded site-wide (docusaurus.config.ts headTags); these
// events show which agent hand-offs readers actually use.
export function track(action: string, page: string): void {
  try {
    window.umami?.track('docs-agent-action', {action, page});
  } catch {
    // Analytics must never break the page.
  }
}
