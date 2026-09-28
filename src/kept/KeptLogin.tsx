import * as React from 'react';
import { Button } from '@base-ui/react/button';
import { Field } from '@base-ui/react/field';
import { Form } from '@base-ui/react/form';
import { ArrowIcon, Separator } from './parts.tsx';
import { signInWithPassword } from './session.ts';
import { navigate } from './navigate.ts';

// /login: username + password (invite-only; accounts are created by hand).
// Two-factor comes later; for now success goes straight to the library.
export function KeptLogin() {
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, setPending] = React.useState(false);
  const clearError = (field: string) => () =>
    setErrors((current) => {
      if (!(field in current)) return current;
      const { [field]: _removed, ...rest } = current;
      return rest;
    });

  return (
    <>
      <section className="KeptContents">
        <h1 className="KeptDisplay KeptCol-hero">Sign in</h1>
      </section>

      <section className="KeptContents">
        <p className="KeptText2 KeptCol-body">
          Kept is in early development. Sign in with the username you were given.
        </p>
      </section>

      <Separator />
      <section className="KeptContents" aria-labelledby="kept-account">
        <h2 id="kept-account" className="KeptText2 KeptCol-label">
          Account
        </h2>
        <Form
          className="KeptForm KeptCol-body"
          errors={errors}
          onFormSubmit={async (values) => {
            setPending(true);
            let error;
            try {
              ({ error } = await signInWithPassword(
                String(values.username),
                String(values.password),
              ));
            } finally {
              setPending(false);
            }
            if (error) {
              setErrors({ [error.field]: error.message });
              return;
            }
            navigate('/library');
          }}
        >
          <div className="KeptList">
            <Field.Root name="username" className="KeptListItem KeptField">
              <Field.Label className="KeptText2 KeptFieldLabel">Username</Field.Label>
              <div className="KeptFieldBody">
                <Field.Control
                  onValueChange={clearError('username')}
                  required
                  pattern="[A-Za-z0-9._\-]{2,32}"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="KeptText2 KeptInput"
                />
                <Field.Error className="KeptText1 KeptFieldError" match="valueMissing">
                  Enter your username.
                </Field.Error>
                <Field.Error className="KeptText1 KeptFieldError" match="patternMismatch">
                  Usernames are 2–32 letters, numbers, dots, dashes or underscores.
                </Field.Error>
                {errors.username && (
                  <Field.Error className="KeptText1 KeptFieldError" match>
                    {errors.username}
                  </Field.Error>
                )}
              </div>
            </Field.Root>
            <Field.Root name="password" className="KeptListItem KeptField">
              <Field.Label className="KeptText2 KeptFieldLabel">Password</Field.Label>
              <div className="KeptFieldBody">
                <Field.Control
                  type="password"
                  onValueChange={clearError('password')}
                  required
                  autoComplete="current-password"
                  className="KeptText2 KeptInput"
                />
                <Field.Error className="KeptText1 KeptFieldError" match="valueMissing">
                  Enter your password.
                </Field.Error>
                {errors.password && (
                  <Field.Error className="KeptText1 KeptFieldError" match>
                    {errors.password}
                  </Field.Error>
                )}
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
              {pending ? 'Signing in…' : 'Continue'}
              <ArrowIcon />
            </Button>
          </div>
        </Form>
      </section>
    </>
  );
}
