import moodeMatcha from './data/moode-matcha.json';
import oklabSquares from './data/oklab-squares.json';
import { loadUploads, prepareUpload, saveUpload, type StoredUpload } from './uploads.ts';

// Mock repository for the lab. Same UI-facing shape the real Supabase repository will expose
// (see kept-v0.html: "keep the same UI-facing API"). Edits to notes, tags, pins and collection
// descriptions are saved in this browser's localStorage; new collections too. Uploaded images
// are saved in IndexedDB (uploads.ts). All of it stays on the device it was made on.

export interface Collection {
  id: string;
  name: string;
  referenceCount: number;
  updatedAt: string; // ISO date
  description: string;
  // Thumbnails of the first few references, for the library mosaic
  covers?: string[];
}

export interface Pin {
  id: string;
  // Normalized 0–1 position on the image
  x: number;
  y: number;
  caption: string;
}

// A Reference is the unit of meaning; its file (the Asset) carries the file facts.
// v0 has one asset per reference.
export interface Reference {
  id: string;
  collectionId: string;
  title: string;
  notes: string;
  tags: string[];
  pins: Pin[];
  addedAt: string; // ISO date
  // Where it was captured from; null when it was uploaded from disk
  captureUrl: string | null;
  // Asset (file) facts
  fileName: string;
  fileType: string;
  width: number;
  height: number;
  bytes: number;
  // Web copies of the file; absent for references without an image yet
  imageUrl?: string;
  thumbUrl?: string;
}

// Real images, imported with scripts/import-images.py (web copies in public/collections/).
interface ImportedImage {
  file: string;
  fileName: string;
  fileType: string;
  width: number;
  height: number;
  bytes: number;
}

const IMPORTED: Record<string, { name: string; addedAt: string; images: ImportedImage[] }> = {
  'moode-matcha': { name: 'moode-matcha', addedAt: '2026-09-18', images: moodeMatcha },
  'oklab-squares': { name: 'oklab-squares', addedAt: '2026-09-20', images: oklabSquares },
};

// ─── Saved edits ───
// Stand-in for the database: what you type survives reloads on this device.

type ReferenceEdit = Partial<Pick<Reference, 'notes' | 'tags' | 'pins'>>;

interface SavedEdits {
  references: Record<string, ReferenceEdit>;
  collections: Record<string, { description?: string }>;
}

const EDITS_KEY = 'kept.lab.edits.v1';

function readEdits(): SavedEdits {
  try {
    const raw = localStorage.getItem(EDITS_KEY);
    if (raw) return JSON.parse(raw) as SavedEdits;
  } catch {
    // Unreadable or blocked storage: start clean.
  }
  return { references: {}, collections: {} };
}

const edits = readEdits();

function writeEdits() {
  try {
    localStorage.setItem(EDITS_KEY, JSON.stringify(edits));
  } catch {
    // Storage blocked: edits last until reload.
  }
}

// Collections made in the app (the imported ones come from IMPORTED).
const CREATED_KEY = 'kept.lab.created.v1';

type CreatedCollection = Pick<Collection, 'id' | 'name' | 'updatedAt'>;

function readCreated(): CreatedCollection[] {
  try {
    const raw = localStorage.getItem(CREATED_KEY);
    if (raw) return JSON.parse(raw) as CreatedCollection[];
  } catch {
    // Unreadable or blocked storage.
  }
  return [];
}

const created = readCreated();

function writeCreated() {
  try {
    localStorage.setItem(CREATED_KEY, JSON.stringify(created));
  } catch {
    // Storage blocked: new collections last until reload.
  }
}

// Uploaded references per collection, newest first.
const uploaded = new Map<string, Reference[]>();

// Reference count and mosaic covers come from uploads plus imported images.
function withCounts(c: Collection): Collection {
  const up = uploaded.get(c.id) ?? [];
  const imported = IMPORTED[c.id]?.images ?? [];
  const covers = [
    ...up.map((r) => r.thumbUrl ?? ''),
    ...imported.map((img) => `/collections/${c.id}/thumb/${img.file}`),
  ].slice(0, 4);
  return { ...c, referenceCount: up.length + imported.length, covers };
}

let collections: Collection[] = [
  ...created.map((c) => ({ ...c, referenceCount: 0, description: '' })),
  ...Object.entries(IMPORTED).map(([id, c]) => ({
    id,
    name: c.name,
    referenceCount: c.images.length,
    updatedAt: c.addedAt,
    description: '',
  })),
].map((c) => withCounts({ ...c, description: edits.collections[c.id]?.description ?? '' }));

function uploadToReference(u: StoredUpload): Reference {
  return {
    id: u.id,
    collectionId: u.collectionId,
    title: u.title,
    notes: '',
    tags: [],
    pins: [],
    addedAt: u.addedAt,
    captureUrl: null,
    fileName: u.fileName,
    fileType: u.fileType,
    width: u.width,
    height: u.height,
    bytes: u.bytes,
    imageUrl: URL.createObjectURL(u.full),
    thumbUrl: URL.createObjectURL(u.thumb),
    ...edits.references[u.id],
  };
}

// Everything waits for saved uploads to load once.
const ready = loadUploads().then((list) => {
  list.sort((a, b) => b.createdAt - a.createdAt);
  for (const u of list) {
    const refs = uploaded.get(u.collectionId) ?? [];
    refs.push(uploadToReference(u));
    uploaded.set(u.collectionId, refs);
  }
  collections = collections.map(withCounts);
});

export async function listCollections(): Promise<Collection[]> {
  await ready;
  return collections;
}

export async function getCollection(id: string): Promise<Collection | undefined> {
  await ready;
  return collections.find((c) => c.id === id);
}

export async function createCollection(name: string): Promise<Collection> {
  const base =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'collection';
  let id = base;
  for (let n = 2; collections.some((c) => c.id === id); n += 1) id = `${base}-${n}`;
  const collection: Collection = {
    id,
    name: name.trim(),
    referenceCount: 0,
    updatedAt: new Date().toISOString().slice(0, 10),
    description: '',
  };
  collections = [collection, ...collections];
  created.unshift({ id: collection.id, name: collection.name, updatedAt: collection.updatedAt });
  writeCreated();
  return collection;
}

export async function updateCollection(
  id: string,
  patch: Pick<Collection, 'description'>,
): Promise<Collection | undefined> {
  const index = collections.findIndex((c) => c.id === id);
  if (index === -1) return undefined;
  const next = { ...collections[index], ...patch };
  collections = collections.map((c) => (c.id === id ? next : c));
  edits.collections[id] = { ...edits.collections[id], ...patch };
  writeEdits();
  return next;
}

// ─── References ───

const referenceCache = new Map<string, Reference[]>();

export async function listReferences(collectionId: string): Promise<Reference[]> {
  await ready;
  const collection = collections.find((c) => c.id === collectionId);
  if (!collection) return [];
  let list = referenceCache.get(collectionId);
  if (!list) {
    list = [...(uploaded.get(collectionId) ?? []), ...importedReferences(collection)];
    referenceCache.set(collectionId, list);
  }
  return list;
}

export type UploadStatus = 'adding' | 'added' | 'failed';

// Add image files to a collection, one at a time; newest end up first.
export async function addUploads(
  collectionId: string,
  files: File[],
  onProgress: (index: number, status: UploadStatus) => void,
): Promise<Reference[]> {
  const list = await listReferences(collectionId);
  const added: Reference[] = [];
  for (const [index, file] of files.entries()) {
    onProgress(index, 'adding');
    try {
      const upload = await prepareUpload(file, collectionId, index);
      await saveUpload(upload);
      const reference = uploadToReference(upload);
      uploaded.set(collectionId, [reference, ...(uploaded.get(collectionId) ?? [])]);
      list.unshift(reference);
      added.push(reference);
      onProgress(index, 'added');
    } catch {
      onProgress(index, 'failed');
    }
  }
  if (added.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    collections = collections.map((c) =>
      c.id === collectionId ? withCounts({ ...c, updatedAt: today }) : c,
    );
    const mine = created.find((c) => c.id === collectionId);
    if (mine) {
      mine.updatedAt = today;
      writeCreated();
    }
  }
  return added;
}

// Every reference in every collection, collection order then reference order.
export async function listAllReferences(): Promise<Reference[]> {
  const lists = await Promise.all(collections.map((c) => listReferences(c.id)));
  return lists.flat();
}

export async function updateReference(
  collectionId: string,
  referenceId: string,
  patch: Partial<Pick<Reference, 'notes' | 'tags' | 'pins'>>,
): Promise<Reference | undefined> {
  const list = await listReferences(collectionId);
  const index = list.findIndex((r) => r.id === referenceId);
  if (index === -1) return undefined;
  const next = { ...list[index], ...patch };
  list[index] = next;
  edits.references[referenceId] = { ...edits.references[referenceId], ...patch };
  writeEdits();
  return next;
}

// ─── Imported images → references ───

function importedReferences(collection: Collection): Reference[] {
  const source = IMPORTED[collection.id];
  if (!source) return [];
  return source.images.map((img, i) => ({
    id: `${collection.id}-${img.file.replace(/\.\w+$/, '')}`,
    collectionId: collection.id,
    // No titles yet; numbered until they're named in the app.
    title: `No. ${String(i + 1).padStart(3, '0')}`,
    notes: '',
    tags: [],
    pins: [],
    addedAt: source.addedAt,
    captureUrl: null,
    fileName: img.fileName,
    fileType: img.fileType,
    width: img.width,
    height: img.height,
    bytes: img.bytes,
    imageUrl: `/collections/${collection.id}/full/${img.file}`,
    thumbUrl: `/collections/${collection.id}/thumb/${img.file}`,
  })).map((r) => ({ ...r, ...edits.references[r.id] }));
}

// ─── Boards (published collections) ───
// A collection can be published as an unlisted, read-only board at /m/:token.
// Kept in localStorage so a copied link opens in another tab; the real app stores
// this in collection_shares.

export interface Share {
  token: string;
  owner: string;
  publishedAt: string; // ISO date
}

// Versioned so old saved shares (from the sample collections) don't linger.
const SHARES_KEY = 'kept.lab.shares.v2';

// One board is published from the start so there's always something to open.
const SEED_SHARES: Record<string, Share> = {
  'moode-matcha': { token: 'mm7q2x9kfa', owner: 'wade', publishedAt: '2026-09-18' },
};

function readShares(): Record<string, Share> {
  try {
    const raw = localStorage.getItem(SHARES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Share>) : { ...SEED_SHARES };
  } catch {
    return { ...SEED_SHARES };
  }
}

let shares = readShares();

function writeShares() {
  try {
    localStorage.setItem(SHARES_KEY, JSON.stringify(shares));
  } catch {
    // Storage blocked: sharing still works until reload.
  }
}

// Unguessable enough for an unlisted link. getRandomValues works on plain-http LAN too.
function newToken() {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('');
}

export async function getShare(collectionId: string): Promise<Share | undefined> {
  return shares[collectionId];
}

export async function publishCollection(collectionId: string, owner: string): Promise<Share> {
  const existing = shares[collectionId];
  if (existing) return existing;
  const share = { token: newToken(), owner, publishedAt: new Date().toISOString().slice(0, 10) };
  shares = { ...shares, [collectionId]: share };
  writeShares();
  return share;
}

// A new token; the old link stops working immediately.
export async function rotateShare(collectionId: string): Promise<Share | undefined> {
  const existing = shares[collectionId];
  if (!existing) return undefined;
  const share = { ...existing, token: newToken() };
  shares = { ...shares, [collectionId]: share };
  writeShares();
  return share;
}

export async function unpublishCollection(collectionId: string): Promise<void> {
  const { [collectionId]: _removed, ...rest } = shares;
  shares = rest;
  writeShares();
}

export interface Board {
  collection: Collection;
  references: Reference[];
  share: Share;
}

export async function getBoard(token: string): Promise<Board | undefined> {
  await ready;
  const entry = Object.entries(shares).find(([, s]) => s.token === token);
  if (!entry) return undefined;
  const [collectionId, share] = entry;
  const collection = collections.find((c) => c.id === collectionId);
  if (!collection) return undefined;
  return { collection, references: await listReferences(collectionId), share };
}

// ─── Invite requests ───
// Kept is invite-only; requests wait for the owner to let people in by hand.
// Saved in this browser for the lab; the real app stores them in Supabase.

export interface InviteRequest {
  name: string;
  email: string;
  note: string;
  requestedAt: string; // ISO date
}

const REQUESTS_KEY = 'kept.lab.requests.v1';

function readRequests(): InviteRequest[] {
  try {
    const raw = localStorage.getItem(REQUESTS_KEY);
    if (raw) return JSON.parse(raw) as InviteRequest[];
  } catch {
    // Unreadable or blocked storage.
  }
  return [];
}

export async function requestInvite(
  request: Omit<InviteRequest, 'requestedAt'>,
): Promise<{ alreadyRequested: boolean }> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  const requests = readRequests();
  const email = request.email.trim().toLowerCase();
  if (requests.some((r) => r.email === email)) return { alreadyRequested: true };
  requests.push({
    name: request.name.trim(),
    email,
    note: request.note.trim(),
    requestedAt: new Date().toISOString().slice(0, 10),
  });
  try {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
  } catch {
    // Storage blocked: the request isn't kept.
  }
  return { alreadyRequested: false };
}
