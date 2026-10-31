// Which addresses the site will use, and for what: links to anywhere on the web (or its own pages), pictures only
// from itself or over https. Anything else counts as nothing. No imports, so the very first script can use it too.
const SAFE_LINK = /^(https?:\/\/|mailto:|\/(?!\/)|#|\?)/i;
const SAFE_IMAGE = /^(https:\/\/|\/(?!\/))/i;

export const safeLink = (url) => (typeof url === 'string' && SAFE_LINK.test(url) ? url : null);
export const safeImage = (url) => (typeof url === 'string' && SAFE_IMAGE.test(url) ? url : null);

// Where a note links to, if it's a web address: the address, and the site's name without its www.
export function linkTo(url) {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return null;
  try {
    const { hostname } = new URL(url);
    return hostname ? { href: url, site: hostname.replace(/^www\./, '') } : null;
  } catch {
    return null;
  }
}
