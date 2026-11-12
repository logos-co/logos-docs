// Loads Umami analytics only after the page has finished loading.
//
// As a deferred <script> in <head>, Umami ran ahead of Docusaurus's own
// deferred bundles, so a slow or unresponsive analytics host held up
// hydration on every page. Injected after `load`, it can't delay anything.
// Umami tracks client-side route changes itself, so injecting once is enough.
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

if (ExecutionEnvironment.canUseDOM) {
  const inject = () => {
    const script = document.createElement('script');
    script.src = 'https://umami.bi.status.im/script.js';
    script.async = true;
    script.dataset.websiteId = '0f95ea33-c693-4fe7-91dc-8effe9645fa8';
    document.head.appendChild(script);
  };

  if (document.readyState === 'complete') {
    inject();
  } else {
    window.addEventListener('load', inject, {once: true});
  }
}
