import * as React from 'react';
import { Field } from '@base-ui/react/field';
import { Input } from '@base-ui/react/input';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { ImageFill, SearchIcon } from './parts.tsx';
import type { Reference } from './repository.ts';
import { sourceLabel } from './utils.ts';

type View = 'grid' | 'list';

const VIEW_KEY = 'kept.lab.view';

const sourceMeta = (r: Reference) => sourceLabel(r.captureUrl);

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

// A labeled section of references: Grid / List switch, search, and the grid or ruled list.
// Used by a collection page and by the library's All references.
export function ReferenceBrowser({
  id,
  heading,
  references,
  meta = sourceMeta,
  emptyText = 'Nothing kept here yet.',
  actions,
}: {
  id: string;
  heading: string;
  references: Reference[];
  // Second line under each item: the source site by default
  meta?: (r: Reference) => string;
  emptyText?: string;
  // Extra controls under the heading, e.g. Add images
  actions?: React.ReactNode;
}) {
  const [query, setQuery] = React.useState('');
  const [view, setView] = React.useState<View>(readView);

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return references;
    return references.filter((r) =>
      [r.title, meta(r), sourceLabel(r.captureUrl), r.fileName, r.notes, ...r.tags, ...r.pins.map((p) => p.caption)]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [references, query, meta]);

  const changeView = (next: View) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Not remembered; fine.
    }
  };

  const hrefFor = (r: Reference) => `/library/${r.collectionId}/${r.id}`;

  return (
    <section className="KeptContents" aria-labelledby={id}>
      <div className="KeptStack KeptStack-4 KeptCol-label">
        <h2 id={id} className="KeptText2">
          {heading}
        </h2>
        <ToggleGroup
          className="KeptSegmented"
          aria-label={`${heading} view`}
          value={[view]}
          onValueChange={(value) => {
            if (value[0]) changeView(value[0] as View);
          }}
        >
          <Toggle className="KeptSegmentedItem KeptText1" value="grid">
            Grid
          </Toggle>
          <Toggle className="KeptSegmentedItem KeptText1" value="list">
            List
          </Toggle>
        </ToggleGroup>
        {actions}
      </div>

      <div className="KeptCol-wide KeptStack KeptStack-6">
        {references.length > 0 && (
          <Field.Root className="KeptSearch">
            <Field.Label className="bui-sr-only">Search {heading.toLowerCase()}</Field.Label>
            <SearchIcon />
            <Input
              className="KeptText2 KeptInput"
              type="search"
              placeholder="Search titles, tags, notes"
              value={query}
              onValueChange={setQuery}
              autoComplete="off"
              enterKeyHint="search"
            />
          </Field.Root>
        )}

        {references.length === 0 && <p className="KeptText2 KeptMuted">{emptyText}</p>}
        {references.length > 0 && visible.length === 0 && (
          <p className="KeptText2 KeptMuted" role="status">
            No references match “{query.trim()}”.
          </p>
        )}

        {view === 'grid' ? (
          <ul className="KeptFigureGrid" aria-label={heading}>
            {visible.map((r) => (
              <li key={r.id}>
                <a className="KeptFigureLink" href={hrefFor(r)}>
                  <span className="KeptImage" aria-hidden>
                    <ImageFill src={r.thumbUrl} />
                    {r.pins.length > 0 && <span className="KeptImagePinCount">{r.pins.length}</span>}
                  </span>
                  <span className="KeptStack KeptStack-0">
                    <span className="KeptText1 KeptFigureName">{r.title}</span>
                    <span className="KeptText1 KeptMuted KeptTruncate">{meta(r)}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="KeptList" aria-label={heading}>
            {visible.map((r) => (
              <li key={r.id}>
                <a className="KeptRefRow" href={hrefFor(r)}>
                  <span className="KeptImage KeptImageThumb" aria-hidden>
                    <ImageFill src={r.thumbUrl} />
                  </span>
                  <span className="KeptText2 KeptFigureName">{r.title}</span>
                  <span className="KeptText1 KeptMuted KeptRefRowMeta KeptTruncate">{meta(r)}</span>
                  <span className="KeptText1 KeptMuted KeptRefRowYear">{r.fileType}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
