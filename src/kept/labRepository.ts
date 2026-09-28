// Browser-local repository for Kept Lab. This intentionally mirrors the repository seam used by
// the rest of Kept so these functions can later call Supabase without changing the Lab UI.

export type LabCategory = 'reference' | 'experiment' | 'concept' | 'ios';
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

const STORAGE_KEY = 'kept.lab.items.v1';

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
];

function seed(
  id: string,
  title: string,
  category: LabCategory,
  url?: string,
  note?: string,
  status: LabStatus = 'saved',
): LabItem {
  return {
    id: `seed-${id}`,
    title,
    category,
    url,
    note,
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
