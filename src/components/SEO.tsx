import React, { useEffect } from 'react';

export interface SEOProps {
  title: string;
  description: string;
  path?: string;
  type?: 'website' | 'article';
  jsonLd?: Record<string, unknown>;
}

const SITE_NAME = 'Kilopdf';

function upsertMetaTag(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', url);
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  path,
  type = 'website',
  jsonLd,
}) => {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    const currentUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${path || window.location.pathname}`
        : `https://YOUR-DOMAIN${path || '/'}`;

    upsertMetaTag('name', 'description', description);
    upsertMetaTag('property', 'og:type', type);
    upsertMetaTag('property', 'og:site_name', SITE_NAME);
    upsertMetaTag('property', 'og:title', fullTitle);
    upsertMetaTag('property', 'og:description', description);
    upsertMetaTag('property', 'og:url', currentUrl);

    upsertMetaTag('name', 'twitter:card', 'summary_large_image');
    upsertMetaTag('name', 'twitter:title', fullTitle);
    upsertMetaTag('name', 'twitter:description', description);

    upsertCanonical(currentUrl);

    const scriptId = 'dynamic-jsonld';
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (jsonLd) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = scriptId;
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(jsonLd);
    } else if (scriptEl) {
      scriptEl.remove();
    }
  }, [title, description, path, type, jsonLd]);

  return null;
};
