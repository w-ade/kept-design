// Browser-local repository for Kept Lab. This intentionally mirrors the repository seam used by
// the rest of Kept so these functions can later call Supabase without changing the Lab UI.

export type LabCategory = 'reference' | 'experiment' | 'concept' | 'ios' | 'map' | 'build';
export type LabStatus = 'saved' | 'exploring' | 'prototyping' | 'promoted';

export interface LabItem {
  id: string;
  title: string;
  url?: string;
  note?: string;
  category: LabCategory;
  tags?: string[];
  source?: string;
  status?: LabStatus;
  createdAt: string;
}

const STORAGE_KEY = 'kept.lab.items.v2';
const LEGACY_STORAGE_KEY = 'kept.lab.items.v1';
const TODO_STORAGE_KEY = 'kept.lab.todo.v1';

const REFERENCE_MAP_NOTES = [
  ['flow', 'Operating flow', 'Owner → library → references → notes, tags, annotations, search and sharing → an unlisted, read-only board for anyone with the link.'],
  ['capabilities', 'Core capabilities', 'Capture images, index with titles and tags, annotate with notes and image markers, organize in collections, search, retrieve, and publish a collection as a board.'],
  ['domain', 'Domain model', 'A User owns Collections. References are the unit of meaning; each has an Asset plus Notes, Tags and Annotations. A Share publishes one collection at an unlisted token.'],
  ['application', 'Application shape', 'Vite + React with Base UI and Kept CSS. Marketing, auth, product and board shells share one repository-facing UI.'],
  ['data', 'Data layer', 'Supabase Postgres, Auth and private Storage sit behind the repository seam, with row-level security and signed image URLs.'],
  ['infrastructure', 'Infrastructure', 'Vercel serves the static app. Supabase provides Postgres, Auth and Storage. Browser-exposed configuration is limited to publishable VITE_ values.'],
  ['later', 'Later system ideas', 'Typed links between references, OCR, image understanding, automatic tagging, semantic search, richer previews, larger-scale file storage and team access remain later work.'],
] as const;

const IOS_NOTES = [
  ['path', 'Native path', 'Move from the web app to a home-screen app, native shell, device features, synced backend and links, then TestFlight and the App Store.'],
  ['approach', 'Native approach', 'Keep one React and Base UI surface. Add native code only where the web cannot reach, such as share extensions, widgets and deeper device integration.'],
  ['home-screen', 'Home screen app', 'Add a manifest, app icons, matched status-bar colors and safe-area handling while keeping Safari and installed-app storage limitations explicit.'],
  ['native-features', 'Native features', 'Camera and photo-library capture, Share → Kept, App Group handoff, native sharing, haptics, keyboard handling and in-app browsing.'],
  ['backend-links', 'Backend and links', 'Use the same Supabase data and sign-in on web and phone, queue offline work, and open kept.design board links through Universal Links.'],
  ['shipping', 'TestFlight and App Store', 'Plan for signing, privacy declarations, in-app account deletion, native-value review requirements, beta distribution and the final store listing.'],
] as const;

const CURRENT_BUILD = [
  ['now', 'backend', 'Build the data layer', 'Supabase schema, storage, and row-level security.'],
  ['now', 'repository', 'Connect the library', 'Replace mock references, boards, and notes with persisted data.'],
  ['now', 'signin', 'Real sign-in', 'Authenticate the actual owner account.'],
  ['now', 'mfa', 'Two-factor authentication', 'Protect each sign-in with a second factor.'],
  ['now', 'reference-detail', 'Reference detail view', 'Create a proper home for an individual saved reference.'],
  ['now', 'reference-metadata', 'Reference metadata', 'Store the context that makes a reference useful later: title, source, notes, tags, dates, and related information.'],
  ['now', 'titles', 'Rename references', 'Allow saved references to have proper titles instead of relying on filenames.'],
  ['now', 'boxes', 'Box annotations', 'Drag to mark a specific region of an image alongside existing pin-style annotations.'],
  ['now', 'search', 'Search the library', 'Find references by title, notes, tags, board, source, and other saved metadata.'],
  ['now', 'deploy', 'Ship to kept.design', 'Configure production environment variables and point the real domain at the working app.'],
  ['next', 's-keep-anywhere', 'Keep from anywhere', 'Capture · Save an image and its source from an iOS share extension or desktop “Keep this” action.'],
  ['next', 's-paste-link', 'Paste a link to keep it', 'Capture · Drop in a URL; Kept fetches the image and records the source.'],
  ['next', 's-dupes', 'Catch duplicates', 'Capture · Warn when an image appears to have already been kept.'],
  ['next', 's-bulk', 'Select many', 'Organize · Multi-select references to tag, move, edit, or remove them in one action.'],
  ['next', 's-smart', 'Smart collections', 'Organize · Saved searches that automatically fill themselves based on rules.'],
  ['next', 's-palette', 'Color palettes', 'Organize · Extract primary colors from references so the library can be searched or filtered by color.'],
  ['next', 's-compare', 'Compare references', 'Work · Place two references side by side with annotations visible for critique and comparison.'],
  ['next', 's-masonry', 'Boards in their real shapes', 'Work · Display board contents in a masonry layout that preserves each reference’s proportions.'],
  ['next', 's-resurface', 'Resurface', 'Find · Periodically bring back useful references that were saved and forgotten.'],
  ['next', 's-command-search', 'Command search', 'Find · Open search from anywhere with `/` or ⌘K.'],
  ['later', 'later-ios', 'iOS app', 'Build the native Kept experience when the core web product is stable.'],
  ['later', 'home-screen', 'Home screen / PWA', 'Add installable web app behavior, icons, manifests, and safe-area support.'],
  ['later', 'invites', 'Invite requests', 'Allow people to request access once Kept is ready for users beyond the owner.'],
  ['later', 'later-sharing', 'Public and shared boards', 'Create shareable board views with controlled visibility.'],
  ['later', 's-previews', 'Share previews', 'Generate proper preview cards when Kept links are pasted into chats or social apps.'],
  ['later', 's-export', 'Exports', 'Export references or boards as files, archives, or contact sheets.'],
  ['later', 'later-auto-metadata', 'Automatic metadata', 'Generate suggested tags, descriptions, and other metadata on capture.'],
  ['later', 'later-ocr', 'OCR', 'Extract readable text from saved references.'],
  ['later', 'later-embeddings', 'Embeddings', 'Generate semantic representations for stronger retrieval and similarity search.'],
  ['later', 'later-visual-similarity', 'Visual similarity', 'Find references that look visually related.'],
  ['later', 'later-related', 'Related references', 'Surface meaningful relationships between saved items.'],
  ['later', 'later-provenance', 'Provenance', 'Track where references came from and how they relate to sources, projects, and each other.'],
] as const;

// Example content is kept in one place so it can be removed without touching the UI.
export const LAB_SEED_ITEMS: LabItem[] = [
  seed('apple-share-extension', 'Apple Share Extension documentation', 'reference', 'https://developer.apple.com/documentation/social', 'Apple documentation for receiving shared content in an app extension.'),
  seed('native-image-annotation', 'Native image annotation interaction', 'reference', undefined, 'Study direct manipulation patterns for marking up a specific region.'),
  seed('mobile-reference-browser', 'Mobile reference browser inspiration', 'reference', undefined, 'Examples of dense visual libraries that remain easy to scan on a phone.'),
  seed('native-quick-capture', 'Native quick capture', 'experiment', undefined, 'Test the shortest path from seeing an image to keeping it with its source.', 'prototyping'),
  seed('image-region-selection', 'Image region selection', 'experiment', undefined, 'Prototype touch-first box selection alongside pin annotations.', 'exploring'),
  seed('drag-reference-board', 'Drag reference to board', 'experiment', undefined, 'Try direct manipulation for organizing a reference without opening its detail view.'),
  seed('automatic-source-recovery', 'Automatic source recovery', 'concept', undefined, 'Explore recovering useful provenance when an image arrives without a source URL.'),
  seed('visual-duplicate-detection', 'Visual duplicate detection', 'concept', undefined, 'Consider perceptual matching for resized or recompressed copies.'),
  seed('reference-relationships', 'Reference relationships', 'concept', undefined, 'Model meaningful connections between references without forcing a hierarchy.'),
  seed('share-extension', 'Share Extension', 'ios', undefined, 'Keep images and source links directly from the iOS share sheet.', 'exploring'),
  seed('quick-keep', 'Quick Keep', 'ios', undefined, 'A minimal capture surface for saving first and organizing later.'),
  seed('camera-roll-import', 'Camera Roll Import', 'ios', undefined, 'Bring selected images into Kept while preserving available photo metadata.'),
  seed('home-screen-widget', 'Home Screen Widget', 'ios', undefined, 'Resurface useful references or offer a quick capture entry point.'),
  seed('native-library', 'Native Library', 'ios', undefined, 'Explore how the reference library should behave as a native SwiftUI surface.'),
  ...IOS_NOTES.map(([id, title, note]) => seed(`ios-${id}`, title, 'ios', undefined, note)),
  ...REFERENCE_MAP_NOTES.map(([id, title, note]) => seed(`map-${id}`, title, 'map', undefined, note)),
  ...CURRENT_BUILD.map(([phase, id, title, note]) =>
    seed(`build-${id}`, title, 'build', undefined, note, 'saved', [phase.toUpperCase()]),
  ),
];

function seed(
  id: string,
  title: string,
  category: LabCategory,
  url?: string,
  note?: string,
  status: LabStatus = 'saved',
  tags?: string[],
): LabItem {
  return {
    id: `seed-${id}`,
    title,
    category,
    url,
    note,
    tags,
    source: domainFor(url),
    status,
    createdAt: '2026-09-27',
  };
}

export function domainFor(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

function readItems(): LabItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LabItem[];

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    const legacy = legacyRaw ? (JSON.parse(legacyRaw) as LabItem[]) : [];
    const byId = new Map(legacy.map((item) => [item.id, item]));
    for (const item of LAB_SEED_ITEMS) {
      if (!byId.has(item.id)) byId.set(item.id, item);
    }

    const todoRaw = localStorage.getItem(TODO_STORAGE_KEY);
    if (todoRaw) {
      const todo = JSON.parse(todoRaw) as {
        done?: string[];
        mine?: { id: string; title: string; detail?: string }[];
      };
      const done = new Set(todo.done ?? []);
      for (const id of done) {
        const item = byId.get(`seed-build-${id}`);
        if (item && !item.tags?.includes('DONE')) {
          byId.set(item.id, { ...item, tags: [...(item.tags ?? []), 'DONE'] });
        }
      }
      for (const task of todo.mine ?? []) {
        const id = `todo-${task.id}`;
        if (!byId.has(id)) {
          byId.set(id, {
            id,
            title: task.title,
            note: task.detail,
            category: 'build',
            tags: ['CUSTOM'],
            status: 'saved',
            createdAt: '2026-09-27',
          });
        }
      }
    }

    const migrated = [...byId.values()];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    // Storage may be unavailable; the seed set remains usable for this visit.
  }
  return LAB_SEED_ITEMS;
}

let items = readItems();

function writeItems() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Changes still last for the current page session when storage is unavailable.
  }
}

export function listLabItems(): LabItem[] {
  return items;
}

export function saveLabItem(input: Omit<LabItem, 'id' | 'createdAt' | 'source'> & { id?: string }): LabItem {
  const existing = input.id ? items.find((item) => item.id === input.id) : undefined;
  const item: LabItem = {
    ...existing,
    ...input,
    id: existing?.id ?? `lab-${Date.now().toString(36)}`,
    createdAt: existing?.createdAt ?? new Date().toISOString().slice(0, 10),
    source: domainFor(input.url),
  };
  items = existing
    ? items.map((current) => (current.id === item.id ? item : current))
    : [item, ...items];
  writeItems();
  return item;
}

export function deleteLabItem(id: string) {
  items = items.filter((item) => item.id !== id);
  writeItems();
}

export function promoteLabItem(id: string): LabItem | undefined {
  const item = items.find((current) => current.id === id);
  if (!item) return undefined;
  return saveLabItem({ ...item, status: 'promoted' });
}
