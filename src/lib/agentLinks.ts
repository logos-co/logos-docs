// Shared helpers for the agent-facing UI (page actions, 404 page, homepage).

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

export function markdownPath(permalink: string): string {
  const clean = permalink.replace(/\/$/, '');
  return `${clean === '' ? '/index' : clean}.md`;
}

export function askPrompt(markdownUrl: string): string {
  return `Read ${markdownUrl} (a page from the Logos documentation; https://docs.logos.co/llms.txt indexes the rest) so I can ask questions about it.`;
}

export const openInClaude = (prompt: string) =>
  `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;

export const openInChatGPT = (prompt: string) =>
  `https://chatgpt.com/?hints=search&q=${encodeURIComponent(prompt)}`;

export function reportIssueUrl(pageUrl: string, title: string): string {
  const params = new URLSearchParams({
    template: 'doc-fix-or-request.yml',
    title: `[Docs] ${title}`,
    document: pageUrl,
  });
  return `https://github.com/logos-co/logos-docs/issues/new?${params}`;
}
