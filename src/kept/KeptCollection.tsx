import * as React from 'react';
import { Field } from '@base-ui/react/field';
import {
  BackLink,
  Separator,
} from './parts.tsx';
import {
  getCollection,
  listReferences,
  updateCollection,
  type Collection,
  type Reference,
} from './repository.ts';
import { ShareDialog } from './KeptShare.tsx';
import { ReferenceBrowser } from './ReferenceBrowser.tsx';
import { UploadDialog } from './KeptUpload.tsx';
import { formatDate, plural, useDocumentTitle } from './utils.ts';

// /library/:collectionId: the references in one collection, as a grid or a ruled list.
export function KeptCollection({ collectionId }: { collectionId: string }) {
  const [collection, setCollection] = React.useState<Collection | null | undefined>(undefined);
  const [references, setReferences] = React.useState<Reference[]>([]);

  useDocumentTitle(collection ? `${collection.name} · KEPT` : undefined);

  React.useEffect(() => {
    let ignore = false;
    Promise.all([getCollection(collectionId), listReferences(collectionId)]).then(([c, refs]) => {
      if (ignore) return;
      setCollection(c ?? null);
      setReferences(refs);
    });
    return () => {
      ignore = true;
    };
  }, [collectionId]);

  if (collection === undefined) return null;
  if (collection === null) {
    return (
      <section className="KeptContents">
        <div className="KeptCol-hero KeptHeading">
          <BackLink href="/library">Library</BackLink>
          <h1 className="KeptDisplay">Collection not found</h1>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="KeptContents">
        <div className="KeptCol-hero KeptHeading">
          <BackLink href="/library">Library</BackLink>
          <h1 className="KeptDisplay">{collection.name}</h1>
        </div>
      </section>

      <section className="KeptContents">
        <div className="KeptCol-body KeptStack KeptStack-2">
          <p className="KeptText2">
            {plural(collection.referenceCount, 'reference')}. Updated{' '}
            {formatDate(collection.updatedAt)}.
          </p>
          <ShareDialog collection={collection} />
        </div>
      </section>

      <Separator />
      <section className="KeptContents" aria-labelledby="kept-description">
        <h2 id="kept-description" className="KeptText2 KeptCol-label">
          Description
        </h2>
        <Field.Root className="KeptCol-body KeptNotes">
          <Field.Label className="bui-sr-only">Description</Field.Label>
          <Field.Control
            render={<textarea rows={3} />}
            className="KeptText2 KeptInput KeptTextarea"
            placeholder="What is this collection for?"
            value={collection.description}
            onValueChange={(description) => {
              setCollection({ ...collection, description });
              void updateCollection(collection.id, { description });
            }}
          />
        </Field.Root>
      </section>

      <Separator />
      <ReferenceBrowser
        id="kept-references"
        heading="References"
        references={references}
        emptyText="Nothing kept here yet. Add images to start."
        actions={
          <UploadDialog
            collection={collection}
            onAdded={async () => {
              // The repository updates its lists in place; copy so React re-renders.
              const [c, refs] = await Promise.all([
                getCollection(collection.id),
                listReferences(collection.id),
              ]);
              if (c) setCollection(c);
              setReferences([...refs]);
            }}
          />
        }
      />
    </>
  );
}
