import * as React from 'react';
import { Menu } from '@base-ui/react/menu';
import { signOut } from './session.ts';
import { getTheme, setTheme, type Theme } from './theme.ts';
import { navigate } from './navigate.ts';

// The signed-in user's menu, opened from their name in the header.
export function AccountMenu({ username }: { username: string }) {
  const [theme, setThemeState] = React.useState<Theme>(getTheme);

  return (
    <Menu.Root>
      <Menu.Trigger className="KeptLink KeptText1 KeptButtonReset KeptButtonText1 KeptMenuTrigger">
        {username}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden className="KeptMenuCaret">
          <path d="M1.5 3.5 5 7l3.5-3.5" stroke="currentColor" strokeLinecap="square" />
        </svg>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="KeptMenuPositioner" sideOffset={8} align="start">
          <Menu.Popup className="KeptMenuPopup">
            <Menu.Group>
              <Menu.GroupLabel className="KeptMenuLabel KeptText1">Appearance</Menu.GroupLabel>
              <Menu.RadioGroup
                value={theme}
                onValueChange={(value) => {
                  setThemeState(value as Theme);
                  setTheme(value as Theme);
                }}
              >
                {(
                  [
                    ['light', 'Light mode'],
                    ['dark', 'Dark mode'],
                    ['system', 'Match system'],
                  ] as const
                ).map(([value, label]) => (
                  <Menu.RadioItem
                    key={value}
                    value={value}
                    className="KeptMenuItem KeptMenuRadio KeptText1"
                    closeOnClick
                  >
                    {label}
                    <Menu.RadioItemIndicator className="KeptMenuCheck">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                        <path d="m2 6.5 2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="1.3" />
                      </svg>
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </Menu.Group>

            <Menu.Separator className="KeptMenuSeparator" />
            <Menu.LinkItem className="KeptMenuItem KeptText1" href="/settings" closeOnClick>
              Settings
            </Menu.LinkItem>

            <Menu.Separator className="KeptMenuSeparator" />
            <Menu.Item
              className="KeptMenuItem KeptText1"
              onClick={() => {
                signOut();
                navigate('/');
              }}
            >
              Sign out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
