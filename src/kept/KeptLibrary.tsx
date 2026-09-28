import * as React from 'react';
import { Button } from '@base-ui/react/button';
import { Dialog } from '@base-ui/react/dialog';
import { Field } from '@base-ui/react/field';
import { Form } from '@base-ui/react/form';
import { Input } from '@base-ui/react/input';
import { ArrowIcon, ImageFill, SearchIcon, Separator } from './parts.tsx';
import {
  createCollection,
  listAllReferences,
  listCollections,
  type Collection,
  type Reference,
} from './repository.ts';
import { ReferenceBrowser } from './ReferenceBrowser.tsx';
import { plural } from './utils.ts';

// /library: collections index, the app home. Tiles follow the base-ui.com "Made for the makers" grid;
// each tile's 2×2 mosaic stands in for the collection's first images.
export function KeptLibrary() {
  const [collections, setCollections] = React.useState<Collection[] | null>(null);
  const [query, setQuery] = React.useState('');
  const [createdId, setCreatedId] = React.useState<string | null>(null);
  const [allReferences, setAllReferences] = React.useState<Reference[]>([]);

  React.useEffect(() => {
    let ignore = false;
    Promise.all([listCollections(), listAllReferences()]).then(([list, refs]) => {
      if (ignore) return;
      setCollections(list);
      setAllReferences(refs);
    });
    return () => {
      ignore = true;
    };
  }, []);

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!collections || !q) return collections ?? [];
    return collections.filter((c) => c.name.toLowerCase().includes(q));
  }, [collections, query]);

  const total = collections?.reduce((sum, c) => sum + c.referenceCount, 0) ?? 0;
  // In All references, each item's second line is the collection it belongs to.
  const collectionNames = React.useMemo(
    () => new Map((collections ?? []).map((c) => [c.id, c.name])),
    [collections],
  );

  return (
    <>
      <section className="KeptContents">
        <h1 className="KeptDisplay KeptCol-hero">Library</h1>
      </section>

      <section className="KeptContents">
        <p className="KeptText2 KeptCol-body">
          {collections
            ? `${plural(collections.length, 'collection')}, ${plural(total, 'reference')}.`
            : ' '}
        </p>
      </section>

      <Separator />
      <section className="KeptContents" aria-labelledby="kept-collections">
        <div className="KeptStack KeptStack-4 KeptCol-label">
          <h2 id="kept-collections" className="KeptText2">
            Collections
          </h2>
          <NewCollectionDialog
            onCreated={(collection) => {
              setQuery('');
              setCollections((list) => [collection, ...(list ?? [])]);
              setCreatedId(collection.id);
            }}
          />
        </div>

        <div className="KeptCol-wide KeptStack KeptStack-6">
          <Field.Root className="KeptSearch">
            <Field.Label className="bui-sr-only">Search collections</Field.Label>
            <SearchIcon />
            <Input
              className="KeptText2 KeptInput"
              type="search"
              placeholder="Search collections"
              value={query}
              onValueChange={setQuery}
              autoComplete="off"
              enterKeyHint="search"
            />
          </Field.Root>

          {collections && visible.length === 0 && (
            <p className="KeptText2 KeptMuted" role="status">
              No collections match “{query.trim()}”.
            </p>
          )}

          <ul className="KeptFigureGrid" aria-label="Collections">
            {visible.map((c) => (
              <li key={c.id} className="KeptFigureItem" data-new={c.id === createdId || undefined}>
                <a className="KeptFigureLink" href={`/library/${c.id}`}>
                  <Mosaic count={c.referenceCount} covers={c.covers ?? []} />
                  <span className="KeptStack KeptStack-0">
                    <span className="KeptText1 KeptFigureName">{c.name}</span>
                    <span className="KeptText1 KeptMuted">{plural(c.referenceCount, 'reference')}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Separator />
      <ReferenceBrowser
        id="kept-all-references"
        heading="All references"
        references={allReferences}
        meta={(r) => collectionNames.get(r.collectionId) ?? ''}
        emptyText="Nothing kept yet."
      />
    </>
  );
}

function NewCollectionDialog({ onCreated }: { onCreated: (collection: Collection) => void }) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="KeptLink KeptLinkArrow KeptText1 KeptButtonReset KeptButtonText1">
        New collection
        <PlusIcon />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="KeptDialogBackdrop" />
        <Dialog.Viewport className="KeptDialogViewport">
          <Dialog.Popup className="KeptDialogPopup">
            <Dialog.Title className="KeptText2">New collection</Dialog.Title>
            <Dialog.Description className="KeptText1 KeptMuted">
              A collection groups references. You can publish it as a board later.
            </Dialog.Description>
            <Form
              className="KeptForm"
              onFormSubmit={async (values) => {
                setPending(true);
                let collection: Collection;
                try {
                  collection = await createCollection(String(values.name));
                } finally {
                  setPending(false);
                }
                onCreated(collection);
                setOpen(false);
              }}
            >
              <div className="KeptList">
                <Field.Root name="name" className="KeptListItem KeptField KeptFieldStacked">
                  <Field.Label className="KeptText1 KeptMuted">Name</Field.Label>
                  <div className="KeptFieldBody">
                    <Field.Control
                      required
                      maxLength={80}
                      autoComplete="off"
                      className="KeptText2 KeptInput"
                    />
                    <Field.Error className="KeptText1 KeptFieldError" match="valueMissing">
                      Give it a name.
                    </Field.Error>
                  </div>
                </Field.Root>
              </div>
              <div className="KeptDialogActions">
                <Dialog.Close className="KeptLink KeptText2 KeptButtonReset">Cancel</Dialog.Close>
                <Button
                  type="submit"
                  disabled={pending}
                  focusableWhenDisabled
                  className="KeptLink KeptLinkArrow KeptText2 KeptButtonReset"
                >
                  {pending ? 'Creating…' : 'Create'}
                  <ArrowIcon />
                </Button>
              </div>
            </Form>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// The first four images; light gray squares stand in when there are none.
function Mosaic({ count, covers }: { count: number; covers: string[] }) {
  return (
    <span className="KeptMosaic" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="KeptMosaicCell" data-empty={i >= count || undefined}>
          <ImageFill src={covers[i]} />
        </span>
      ))}
    </span>
  );
}

// base-ui.com homepage PlusIcon
function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1.5 8h13M8 14.5v-13" />
    </svg>
  );
}
