import * as React from 'react';
import { Button } from '@base-ui/react/button';
import { AccountMenu as KeptAccountMenu } from './KeptAccountMenu.tsx';
import { KeptReferral, KeptSettings } from './KeptAccountPages.tsx';
import { KeptBoard } from './KeptBoard.tsx';
import { KeptCollection } from './KeptCollection.tsx';
import { KeptLanding } from './KeptLanding.tsx';
import { KeptLab } from './KeptLab.tsx';
import { KeptLibrary } from './KeptLibrary.tsx';
import { KeptLogin } from './KeptLogin.tsx';
import { KeptIos } from './KeptIos.tsx';
import { KeptMap } from './KeptMap.tsx';
import { KeptReference } from './KeptReference.tsx';
import { KeptRequest } from './KeptRequest.tsx';
import { KeptTodo } from './KeptTodo.tsx';
import { ArrowIcon, ArrowLink, Separator } from './parts.tsx';
import { completeMfaForLab, getSession } from './session.ts';
import './kept.css';
import { navigate } from './navigate.ts';

// Kept, synced from the kept-ui lab (scripts/sync-kept-ui.mjs). Routes are real paths.
// Shells are modeled on the base-ui.com homepage ((website)/layout.tsx + page.tsx):
// an 8-column grid where sections are `display: contents` and labels sit in the left gutter.

type Shell = 'marketing' | 'auth' | 'app' | 'board';

const MARKETING_NAV = [
  { href: '/', label: 'Landing', route: '' },
  { href: '/library', label: 'Library', route: 'library' },
  { href: '/map', label: 'Map', route: 'map' },
];
const AUTH_NAV = MARKETING_NAV.slice(0, 1);
const APP_NAV = [
  { href: '/library', label: 'Library', route: 'library' },
  { href: '/lab', label: 'Lab', route: 'lab' },
  { href: '/map', label: 'Map', route: 'map' },
  { href: '/todo', label: 'To do', route: 'todo' },
];

const TITLES: Record<string, string> = {
  '': 'KEPT — A library you can actually operate.',
  login: 'Sign in · KEPT',
  'login/mfa': 'Two-factor · KEPT',
  request: 'Request an invite · KEPT',
  library: 'Library · KEPT',
  lab: 'Lab · KEPT',
  map: 'System map · KEPT',
  ios: 'Kept on iOS · KEPT',
  todo: 'To do · KEPT',
  settings: 'Settings · KEPT',
  referral: 'Referral · KEPT',
};

const COMING_NEXT: Record<string, string> = {};

function shellFor(route: string): Shell {
  if (route.startsWith('m/')) return 'board';
  if (route.startsWith('login') || route === 'request') return 'auth';
  if (route === 'library' || route.startsWith('library/') || route === 'lab') return 'app';
  // Account pages, from the menu under your name
  if (route === 'todo' || route === 'settings' || route === 'referral') return 'app';
  return 'marketing';
}

// Signed-in routes: send the visitor to whichever auth step they still owe.
function useAuthGate(route: string) {
  const session = getSession();
  const redirect =
    shellFor(route) !== 'app' || session?.aal === 'aal2'
      ? null
      : session
        ? '/login/mfa'
        : '/login';

  React.useEffect(() => {
    if (redirect) navigate(redirect, 'replace');
  }, [redirect]);

  return redirect !== null;
}

export function KeptApp({ route }: { route: string }) {
  const redirecting = useAuthGate(route);

  React.useEffect(() => {
    const previous = document.title;
    // Collection and reference pages title themselves once their data loads.
    if (!route.startsWith('library/') && !route.startsWith('m/')) document.title = TITLES[route] ?? 'KEPT';
    return () => {
      document.title = previous;
    };
  }, [route]);

  if (redirecting) return null;

  const shell = shellFor(route);
  // Board shell: a shared, read-only page with no site chrome and no sign-in.
  if (shell === 'board') return <KeptBoard key={route} token={route.slice(2)} />;
  const nav = shell === 'app' ? APP_NAV : shell === 'auth' ? AUTH_NAV : MARKETING_NAV;
  const session = getSession();

  let content: React.ReactNode;
  if (route === '') content = <KeptLanding />;
  else if (route === 'login') content = <KeptLogin />;
  else if (route === 'login/mfa') content = <KeptMfaPlaceholder />;
  else if (route === 'request') content = <KeptRequest />;
  else if (route === 'library') content = <KeptLibrary />;
  else if (route === 'lab') content = <KeptLab />;
  else if (route === 'map') content = <KeptMap />;
  else if (route === 'ios') content = <KeptIos />;
  else if (route === 'todo') content = <KeptTodo />;
  else if (route === 'settings') content = <KeptSettings />;
  else if (route === 'referral') content = <KeptReferral />;
  else if (route.startsWith('library/')) {
    const [, collectionId, referenceId] = route.split('/');
    content = referenceId ? (
      <KeptReference key={referenceId} collectionId={collectionId} referenceId={referenceId} />
    ) : (
      <KeptCollection key={collectionId} collectionId={collectionId} />
    );
  }
  else content = <KeptComingNext label={COMING_NEXT[route]} />;

  return (
    <div className="KeptBody">
      <div className="KeptGrid">
        <header className="KeptContents">
          <a className="KeptWordmark KeptCol-logo" href="/" aria-label="Kept home">
            KEPT
          </a>
          <nav className="KeptStack KeptCol-nav" aria-label="Site">
            {nav.map((item) => (
              <a
                key={item.href}
                className="KeptLink KeptText1"
                href={item.href}
                aria-current={item.route === route ? 'page' : undefined}
              >
                {item.label}
              </a>
            ))}
            {shell === 'app' && session && <KeptAccountMenu username={session.username} />}
          </nav>
          <span className="KeptText1 KeptMuted KeptCol-status">
            Early development
          </span>
        </header>

        <main className="KeptContents">{content}</main>

        <Separator />
        <footer className="KeptContents">
          <span className="KeptText1 KeptCol-label">© Kept</span>
        </footer>
      </div>
    </div>
  );
}

// Two-factor isn't built yet; this stand-in lets the lab reach the library.
function KeptMfaPlaceholder() {
  return (
    <section className="KeptContents">
      <h1 className="KeptDisplay KeptCol-hero">Two-factor</h1>
      <p className="KeptText2 KeptMuted KeptCol-full">
        Not built in the lab yet. Continue without a code for now.
      </p>
      <div className="KeptCol-full">
        <Button
          className="KeptLink KeptLinkArrow KeptText2 KeptButtonReset"
          onClick={() => {
            completeMfaForLab();
            navigate('/library');
          }}
        >
          Continue to library
          <ArrowIcon />
        </Button>
      </div>
    </section>
  );
}

function KeptComingNext({
  label,
  back = '/',
  backLabel = 'Back to landing',
}: {
  label?: string;
  back?: string;
  backLabel?: string;
}) {
  return (
    <section className="KeptContents">
      <h1 className="KeptDisplay KeptCol-hero">{label ?? 'Not found'}</h1>
      <p className="KeptText2 KeptMuted KeptCol-full">Not built in the lab yet.</p>
      <div className="KeptCol-full">
        <ArrowLink href={back}>{backLabel}</ArrowLink>
      </div>
    </section>
  );
}
