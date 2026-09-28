import * as React from 'react';
import { Button } from '@base-ui/react/button';
import { Field } from '@base-ui/react/field';
import { Form } from '@base-ui/react/form';
import { ArrowIcon, ArrowLink, Separator } from './parts.tsx';
import { requestInvite } from './repository.ts';

// /request: ask for an invite. Kept is invite-only; the owner lets people in by hand.
export function KeptRequest() {
  const [pending, setPending] = React.useState(false);
  const [sent, setSent] = React.useState<{ email: string; alreadyRequested: boolean } | null>(null);

  return (
    <>
      <section className="KeptContents">
        <h1 className="KeptDisplay KeptCol-hero">Request an invite</h1>
      </section>

      <section className="KeptContents">
        <p className="KeptText2 KeptCol-body">
          Kept is invite-only while it’s in early development. Every account is let in by hand, so
          tell us a little about what you’d keep.
        </p>
      </section>

      <Separator />
      <section className="KeptContents" aria-labelledby="kept-request">
        <h2 id="kept-request" className="KeptText2 KeptCol-label">
          {sent ? 'Sent' : 'Your details'}
        </h2>

        {sent ? (
          <div className="KeptCol-body KeptStack KeptStack-4" role="status">
            <p className="KeptText2">
              {sent.alreadyRequested
                ? 'You’re already on the list.'
                : 'You’re on the list.'}
            </p>
            <p className="KeptText2 KeptMuted">
              {sent.alreadyRequested
                ? `A request from ${sent.email} is already waiting. You’ll hear back there.`
                : `You’ll hear back at ${sent.email} once your account is ready.`}
            </p>
            <div className="KeptStack KeptStack-2">
              <ArrowLink href="/">Back to Kept</ArrowLink>
              <a className="KeptLink KeptText1" href="/login">
                Already have an account? Sign in
              </a>
            </div>
          </div>
        ) : (
          <Form
            className="KeptForm KeptCol-body"
            onFormSubmit={async (values) => {
              setPending(true);
              const email = String(values.email).trim().toLowerCase();
              let alreadyRequested: boolean;
              try {
                ({ alreadyRequested } = await requestInvite({
                  name: String(values.name),
                  email,
                  note: String(values.note ?? ''),
                }));
              } finally {
                setPending(false);
              }
              setSent({ email, alreadyRequested });
            }}
          >
            <div className="KeptList">
              <Field.Root name="name" className="KeptListItem KeptField">
                <Field.Label className="KeptText2 KeptFieldLabel">Name</Field.Label>
                <div className="KeptFieldBody">
                  <Field.Control
                    required
                    maxLength={80}
                    autoComplete="name"
                    className="KeptText2 KeptInput"
                  />
                  <Field.Error className="KeptText1 KeptFieldError" match="valueMissing">
                    Enter your name.
                  </Field.Error>
                </div>
              </Field.Root>
              <Field.Root name="email" className="KeptListItem KeptField">
                <Field.Label className="KeptText2 KeptFieldLabel">Email</Field.Label>
                <div className="KeptFieldBody">
                  <Field.Control
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="KeptText2 KeptInput"
                  />
                  <Field.Error className="KeptText1 KeptFieldError" match="valueMissing">
                    Enter your email.
                  </Field.Error>
                  <Field.Error className="KeptText1 KeptFieldError" match="typeMismatch">
                    That doesn’t look like an email.
                  </Field.Error>
                </div>
              </Field.Root>
              <Field.Root name="note" className="KeptListItem KeptField">
                <Field.Label className="KeptText2 KeptFieldLabel">
                  What would you keep? <span className="KeptMuted">Optional</span>
                </Field.Label>
                <div className="KeptFieldBody">
                  <Field.Control
                    render={<textarea rows={3} />}
                    maxLength={500}
                    className="KeptText2 KeptInput KeptTextarea KeptTextareaShort"
                    placeholder="Type specimens, packaging, a moodboard for a brand…"
                  />
                </div>
              </Field.Root>
            </div>

            <div className="KeptFormActions">
              <Button
                type="submit"
                disabled={pending}
                focusableWhenDisabled
                className="KeptLink KeptLinkArrow KeptText2 KeptButtonReset"
              >
                {pending ? 'Sending…' : 'Send request'}
                <ArrowIcon />
              </Button>
              <a className="KeptLink KeptText1" href="/login">
                Already have an account? Sign in
              </a>
            </div>
          </Form>
        )}
      </section>
    </>
  );
}
