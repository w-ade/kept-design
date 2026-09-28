import { Separator } from './parts.tsx';

const SETTINGS = [
  ['Account', 'Username, password and email.'],
  ['Two-factor', 'Set up or reset your authenticator app.'],
  ['Appearance', 'Light, dark or match system. Already works, from the menu under your name.'],
  ['Boards', 'Everything you’ve shared, with its link, in one place.'],
  ['Export', 'Download your library.'],
  ['Delete account', 'Remove your account and everything in it.'],
] as const;

// Settings (signed in): coming soon. This says what it will hold.

export function KeptSettings() {
  return (
    <>
      <section className="KeptContents">
        <h1 className="KeptDisplay KeptCol-hero">Settings</h1>
      </section>
      <section className="KeptContents">
        <p className="KeptText2 KeptMuted KeptCol-body">Coming soon.</p>
      </section>
      <Separator />
      <section className="KeptContents" aria-labelledby="kept-settings-details">
        <h2 id="kept-settings-details" className="KeptText2 KeptCol-label">
          What will live here
        </h2>
        <div className="KeptCol-body">
          <dl className="KeptList KeptDetails KeptListWide">
            {SETTINGS.map(([term, detail]) => (
              <div key={term} className="KeptListItem">
                <dt className="KeptText2">{term}</dt>
                <dd className="KeptText2">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
