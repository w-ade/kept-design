import { createElement as h, type ReactNode } from 'react'

// Skeleton wireframes for the iOS screens.
//
// Geometry is real: the frame is iPhone 17 Pro at 402x874pt, and every
// measurement below is in points, scaled by --pt in styles.css. Chrome
// (Dynamic Island, nav bar, tab bar, home indicator) is owned by the frame
// in Screens.tsx — a screen only describes which chrome it wants and what
// sits in the content region.

const el = (className: string, ...kids: ReactNode[]) => h('div', { className }, ...kids)

const bar = (w: string, tall = false) =>
  h('div', { className: tall ? 'sk sk-tall' : 'sk', style: { width: w } })

// 3 across at 16pt margins with 2pt gutters => 122pt cells.
const grid = (n: number) =>
  el('sk-grid', ...Array.from({ length: n }, (_, i) => h('div', { className: 'sk-cell', key: i })))

// 44pt minimum tap target, per HIG.
const rows = (n: number) =>
  el(
    'sk-rows',
    ...Array.from({ length: n }, (_, i) =>
      h('div', { className: 'sk-row', key: i }, bar('60%'), h('div', { className: 'sk-chev' })),
    ),
  )

const fields = (n: number) =>
  el('sk-fields', ...Array.from({ length: n }, (_, i) => h('div', { className: 'sk-field', key: i })))

export interface Screen {
  id: string
  name: string
  route: string
  from: string
  /** Large title (96pt of nav) vs standard inline nav bar (44pt), per HIG. */
  nav: 'large' | 'inline' | 'none'
  navTitle?: string
  back?: string
  search?: boolean
  tab?: 'Library' | 'Capture' | 'Account'
  render: () => ReactNode
  notes: string[]
}

export const SCREENS: Screen[] = [
  {
    id: 'library',
    name: 'Library',
    route: '/library',
    from: 'KeptLibrary.tsx',
    nav: 'large',
    navTitle: 'Library',
    search: true,
    tab: 'Library',
    render: () => el('v', grid(9)),
    notes: [
      'Large title nav bar: 96pt total (44pt bar + 52pt title area), 34pt bold title on a 16pt margin. Collapses to the 44pt inline bar on scroll — that transition is free on iOS and is most of why the screen feels native.',
      'Search is a UISearchController in the nav bar, 36pt tall, revealed by pull-down rather than always on screen. The web puts it inline; do not port that.',
      'Collection grid, KeptFigureGrid on web. 3 across inside 16pt margins with 2pt gutters gives 122pt cells at this width.',
      'New collection goes in the nav bar trailing slot as a +, opening a sheet. The web dialog does not translate.',
      'Tab bar is 49pt above a 34pt home indicator inset, 83pt total. On iOS 26 this is the floating Liquid Glass bar that contracts on scroll, not a flush bar — worth confirming against the current HIG before building.',
    ],
  },
  {
    id: 'collection',
    name: 'Collection',
    route: '/library/:collectionId',
    from: 'KeptCollection.tsx',
    nav: 'inline',
    navTitle: 'moode-matcha',
    back: 'Library',
    tab: 'Library',
    render: () => el('v', el('sk-head', bar('70%')), grid(12)),
    notes: [
      'Inline 44pt nav bar with a back chevron and the parent title. Web draws KeptCrumbs breadcrumbs; iOS gets the native back plus the edge-swipe, so the breadcrumb row is dropped.',
      'Description sits under the title. It is editable in place on web — on iOS that wants an explicit Edit affordance rather than a focusable paragraph.',
      'The grid uses the thumb/ 480px copies, which is what oklab-squares just generated.',
      'Tapping a cell should be a zoom transition from the tapped cell, not a push. That is the shot at making it feel better than the web.',
    ],
  },
  {
    id: 'reference',
    name: 'Reference',
    route: '/library/:collectionId/:referenceId',
    from: 'KeptReference.tsx',
    nav: 'inline',
    navTitle: '',
    back: 'moode-matcha',
    tab: 'Library',
    render: () =>
      el(
        'v',
        el('sk-hero', el('sk-pin'), el('sk-pin sk-pin-2')),
        el('sk-head', bar('80%'), bar('50%')),
        el('sk-tags', bar('18%'), bar('26%'), bar('14%')),
        rows(2),
      ),
    notes: [
      'The full/ 1200px image, edge to edge at 402pt wide rather than inside the 16pt margin. Pinch to zoom.',
      'Pins are a coordinate overlay on the image (KeptPin), not a control in a layout. This is the single hardest thing on the list to port and it does not get easier by waiting.',
      'Horizontal swipe steps between references. Web uses the keyboard and a KeptPager — the pager row disappears on iOS.',
      'Caption and notes below the fold: "What is worth remembering about this one?"',
      'Tags as 44pt-tap-target chips.',
      '483 lines on web, the largest screen. Most likely candidate for splitting — image and metadata may want to be a sheet over the image rather than one scroll.',
    ],
  },
  {
    id: 'capture',
    name: 'Capture',
    route: '— (new)',
    from: 'no real web equivalent',
    nav: 'none',
    tab: 'Capture',
    render: () =>
      el('v v-flush', el('sk-camera'), el('sk-strip', ...Array.from({ length: 4 }, (_, i) => h('div', { className: 'sk-cell', key: i })))),
    notes: [
      'Full-bleed under the status bar, no nav bar. The only screen that ignores the top safe area for content while keeping controls clear of the 59pt inset.',
      'KeptUpload is a drag-and-drop zone and is not a useful reference. This is PhotoKit plus the camera.',
      'Recents strip, multi-select, sitting above the tab bar.',
      'Needs a destination step — which collection it lands in — probably a sheet after selection rather than a screen before it.',
      'The share extension matters more than this screen: capture from Safari or Photos without opening Kept. That is a separate target in Xcode and should be scoped as its own issue.',
    ],
  },
  {
    id: 'signin',
    name: 'Sign in',
    route: '/login',
    from: 'KeptLogin.tsx',
    nav: 'none',
    render: () =>
      el('v v-center', el('sk-mark'), fields(2), el('sk-btn'), el('sk-apple'), bar('55%')),
    notes: [
      'No nav bar, content centred in the safe area. Keyboard avoidance is the whole game here — the 34pt bottom inset is under the keyboard once it is up.',
      'Username and password as boxed 44pt fields, matching the web change in a7f71f9.',
      'Two-factor is a separate push at /login/mfa, not a step inside this screen.',
      'Sign in with Apple: if the app offers any third-party sign-in, App Review requires this. It does not exist on web and is an open decision, not a detail.',
    ],
  },
  {
    id: 'request',
    name: 'Request an invite',
    route: '/request',
    from: 'KeptRequest.tsx',
    nav: 'inline',
    navTitle: 'Request an invite',
    back: 'Sign in',
    render: () => el('v', fields(2), el('sk-area'), el('sk-btn')),
    notes: [
      'Presented as a sheet from Sign in, so the nav bar carries a Cancel rather than a back chevron.',
      'Name, email, and an optional "what for" — "Type specimens, packaging, a moodboard for a brand…".',
      'The app is invite-only, so App Review needs a working demo account in the review notes. That has sunk submissions before and belongs in p11.',
    ],
  },
  {
    id: 'account',
    name: 'Account',
    route: '/account',
    from: 'KeptAccountPages.tsx',
    nav: 'large',
    navTitle: 'Account',
    tab: 'Account',
    render: () => el('v', rows(5)),
    notes: [
      'Grouped inset list, the standard iOS settings shape. Settings and Referral are the two real sections today.',
      '44pt rows with disclosure chevrons.',
      'Theme follows the system. theme.ts writes data-theme on web; on iOS overriding the system appearance needs a reason.',
      'Sign out at the bottom, destructive red, in its own group.',
    ],
  },
  {
    id: 'board',
    name: 'Board',
    route: '/m/:token',
    from: 'KeptBoard.tsx',
    nav: 'large',
    navTitle: 'Board',
    render: () => el('v', el('sk-head', bar('45%')), grid(9)),
    notes: [
      'The published read-only view. No tab bar — this is opened from a link, not from inside the app.',
      'Must work signed out. The only screen with that requirement, which makes it disproportionately expensive.',
      'Genuinely undecided for v0.0.0: a board is what you send to someone else, so it may stay web-only and the app just produces the link.',
      'moode-matcha has a token in SEED_SHARES; oklab-squares does not.',
    ],
  },
]
