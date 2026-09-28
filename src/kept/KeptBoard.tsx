import * as React from 'react';
import { Button } from '@base-ui/react/button';
import { Dialog } from '@base-ui/react/dialog';
import {
  ArrowIcon,
  ImageFill,
} from './parts.tsx';
import { getBoard, type Board, type Reference } from './repository.ts';
import { formatDate, fullImageStyle, plural, sourceLabel, useDocumentTitle } from './utils.ts';

// /m/:token: an unlisted, read-only moodboard. Board shell: no nav, no sign-in.
export function KeptBoard({ token }: { token: string }) {
  const [board, setBoard] = React.useState<Board | null | undefined>(undefined);
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    let ignore = false;
    getBoard(token).then((b) => {
      if (!ignore) setBoard(b ?? null);
    });
    return () => {
      ignore = true;
    };
  }, [token]);

  useDocumentTitle(
    board === undefined ? undefined : board ? `${board.collection.name} · KEPT` : 'Board unavailable · KEPT',
  );

  if (board === undefined) return <div className="KeptBody" />;

  if (board === null) {
    return (
      <div className="KeptBody">
        <div className="KeptGrid">
          <section className="KeptContents">
            <h1 className="KeptDisplay KeptCol-hero">This board isn't available</h1>
            <p className="KeptText2 KeptMuted KeptCol-body">
              The link may be wrong, or its owner has unpublished it or made a new link.
            </p>
          </section>
          <BoardFooter />
        </div>
      </div>
    );
  }

  const { collection, references, share } = board;

  return (
    <div className="KeptBody">
      <div className="KeptGrid">
        <header className="KeptContents">
          <div className="KeptCol-hero KeptHeading">
            <h1 className="KeptDisplay">{collection.name}</h1>
            <p className="KeptText1 KeptMuted">
              Kept by {share.owner} · {plural(references.length, 'reference')} · Published{' '}
              {formatDate(share.publishedAt)}
            </p>
          </div>
          {collection.description.trim() && (
            <p className="KeptText2 KeptCol-body KeptPreLine">{collection.description}</p>
          )}
        </header>

        <main className="KeptContents">
          {references.length === 0 ? (
            <p className="KeptText2 KeptMuted KeptCol-full">This board is empty.</p>
          ) : (
            <ul className="KeptBoardGrid KeptCol-full" aria-label={collection.name}>
              {references.map((r, i) => (
                <li key={r.id}>
                  <button type="button" className="KeptBoardItem" onClick={() => setOpenIndex(i)}>
                    <span className="KeptImage" aria-hidden>
                      <ImageFill src={r.thumbUrl} />
                    </span>
                    <span className="KeptText1 KeptFigureName">{r.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </main>

        <BoardFooter />
      </div>

      <Lightbox
        references={references}
        index={openIndex}
        onIndexChange={setOpenIndex}
      />
    </div>
  );
}

function BoardFooter() {
  return (
    <footer className="KeptContents">
      <p className="KeptText1 KeptMuted KeptCol-full KeptBoardFooter">
        Made with{' '}
        <a className="KeptLink" href="/">
          KEPT
        </a>
        , a library you can actually operate.
      </p>
    </footer>
  );
}

// Full-screen viewer: the image with its pins, then title, source, notes and pin captions.
function Lightbox({
  references,
  index,
  onIndexChange,
}: {
  references: Reference[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}) {
  // Keep showing the last reference while the close animation runs.
  const [shown, setShown] = React.useState(index ?? 0);
  if (index !== null && index !== shown) setShown(index);
  const reference = references[shown];
  const hasPrev = shown > 0;
  const hasNext = shown < references.length - 1;

  const go = (delta: number) => {
    const next = shown + delta;
    if (next >= 0 && next < references.length) onIndexChange(next);
  };

  return (
    <Dialog.Root
      open={index !== null}
      onOpenChange={(open) => {
        if (!open) onIndexChange(null);
      }}
    >
      <Dialog.Portal>
        <Dialog.Popup
          className="KeptLightbox"
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') go(-1);
            if (event.key === 'ArrowRight') go(1);
          }}
        >
          {reference && (
            <div className="KeptLightboxInner">
              <div className="KeptLightboxBar">
                <span className="KeptText1 KeptMuted">
                  {shown + 1} of {references.length}
                </span>
                <Dialog.Close className="KeptLink KeptText1 KeptButtonReset KeptButtonText1">
                  Close
                </Dialog.Close>
              </div>

              <div className="KeptLightboxImage">
                <span
                  className="KeptImage KeptLightboxSquare"
                  style={fullImageStyle(reference)}
                  aria-hidden
                >
                  <ImageFill src={reference.imageUrl} eager />
                  {reference.pins.map((pin, i) => (
                    <span
                      key={pin.id}
                      className="KeptPin"
                      style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
                    >
                      {i + 1}
                    </span>
                  ))}
                </span>
              </div>

              <div className="KeptLightboxText">
                <Dialog.Title className="KeptText2">{reference.title}</Dialog.Title>
                <Dialog.Description className="KeptText1 KeptMuted">
                  {sourceLabel(reference.captureUrl)}
                </Dialog.Description>
                {reference.notes && <p className="KeptText1 KeptPreLine">{reference.notes}</p>}
                {reference.pins.length > 0 && (
                  <ol className="KeptList KeptLightboxPins">
                    {reference.pins.map((pin, i) => (
                      <li key={pin.id} className="KeptListItem KeptPinRow KeptPinRowStatic">
                        <span className="KeptPin KeptPinStatic" aria-hidden>
                          {i + 1}
                        </span>
                        <span className="KeptText1">{pin.caption || 'No caption'}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div className="KeptLightboxNav">
                <Button
                  className="KeptLink KeptLinkArrow KeptText2 KeptButtonReset"
                  data-direction="prev"
                  disabled={!hasPrev}
                  focusableWhenDisabled
                  onClick={() => go(-1)}
                >
                  <span className="KeptFlip">
                    <ArrowIcon />
                  </span>
                  Previous
                </Button>
                <Button
                  className="KeptLink KeptLinkArrow KeptText2 KeptButtonReset"
                  disabled={!hasNext}
                  focusableWhenDisabled
                  onClick={() => go(1)}
                >
                  Next
                  <ArrowIcon />
                </Button>
              </div>
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
