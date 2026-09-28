// Product paths for the Kept UI. Lab used `#/kept/...`; these are real SPA paths.

export const href = {
  home: '/',
  login: '/login',
  mfa: '/login/mfa',
  request: '/request',
  library: '/library',
  lab: '/lab',
  map: '/map',
  ios: '/ios',
  todo: '/todo',
  settings: '/settings',
  referral: '/referral',
  collection: (collectionId: string) => `/library/${encodeURIComponent(collectionId)}`,
  reference: (collectionId: string, referenceId: string) =>
    `/library/${encodeURIComponent(collectionId)}/${encodeURIComponent(referenceId)}`,
  board: (token: string) => `/m/${encodeURIComponent(token)}`,
} as const;

/** Hash rest (`#/kept/library/…`) → pathname rest (`library/…`). */
export function pathToKeptRoute(pathname = window.location.pathname): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path === '/' ? '' : path.replace(/^\//, '');
}
