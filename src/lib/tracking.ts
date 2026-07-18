import type { AnalyticsEventType } from '../types';

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/track', blob);
  } else {
    fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  }
}

export function trackEvent(
  orgId: string,
  articleId: string,
  type: AnalyticsEventType,
  extra: { source?: string | null; dwellSeconds?: number } = {},
) {
  send({ orgId, articleId, type, source: extra.source ?? null, dwellSeconds: extra.dwellSeconds });
}

/** Reads ?utm_source= from the current URL (set on every generated SNS link). */
export function getSnsSource(): string | null {
  return new URLSearchParams(window.location.search).get('utm_source');
}

/**
 * Tracks a page view immediately, then measures dwell time / bounce on the way
 * out. A "bounce" is a visit shorter than 10 seconds with no CTA interaction.
 */
export function trackArticleVisit(orgId: string, articleId: string) {
  const source = getSnsSource() || 'direct';
  const start = Date.now();
  let ctaClicked = false;

  trackEvent(orgId, articleId, 'pv', { source });

  const flush = () => {
    const dwellSeconds = Math.round((Date.now() - start) / 1000);
    trackEvent(orgId, articleId, 'dwell', { dwellSeconds });
    if (dwellSeconds < 10 && !ctaClicked) {
      trackEvent(orgId, articleId, 'bounce');
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);

  return {
    markCtaClicked: () => {
      ctaClicked = true;
    },
  };
}
