import * as React from 'react';
import { Button } from '@base-ui/react/button';
import { Dialog } from '@base-ui/react/dialog';
import { Input } from '@base-ui/react/input';
import { ArrowIcon } from './parts.tsx';
import {
  getShare,
  publishCollection,
  rotateShare,
  unpublishCollection,
  type Collection,
  type Share,
} from './repository.ts';
import { getSession } from './session.ts';
import { boardUrl, formatDate } from './utils.ts';

// Publish a collection as an unlisted board, copy its link, rotate it or take it down.
export function ShareDialog({ collection }: { collection: Collection }) {
  const [share, setShare] = React.useState<Share | null | undefined>(undefined);
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [rotated, setRotated] = React.useState(false);
  const linkRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    getShare(collection.id).then((s) => setShare(s ?? null));
  }, [collection.id]);

  const run = async (action: () => Promise<Share | null | undefined>) => {
    setPending(true);
    try {
      setShare((await action()) ?? null);
    } finally {
      setPending(false);
    }
    setCopied(false);
  };

  const copy = async () => {
    if (!share) return;
    const url = boardUrl(share.token);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // No async clipboard on plain-http LAN addresses: fall back to selecting and copying.
      linkRef.current?.select();
      document.execCommand('copy');
    }
    setCopied(true);
  };

  if (share === undefined) return null;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) {
          setCopied(false);
          setRotated(false);
        }
      }}
    >
      <p className="KeptText2 KeptMuted">
        {share ? 'Shared as a board. ' : 'Not shared. '}
        <Dialog.Trigger className="KeptLink KeptLinkArrow KeptText2 KeptButtonReset KeptInlineTrigger">
          {share ? 'Manage' : 'Share as a board'}
          <ArrowIcon />
        </Dialog.Trigger>
      </p>
      <Dialog.Portal>
        <Dialog.Backdrop className="KeptDialogBackdrop" />
        <Dialog.Viewport className="KeptDialogViewport">
          <Dialog.Popup className="KeptDialogPopup">
            <Dialog.Title className="KeptText2">
              {share ? 'Shared as a board' : 'Share as a board'}
            </Dialog.Title>
            <Dialog.Description className="KeptText1 KeptMuted">
              Anyone with the link can view “{collection.name}” as a read-only board. It isn't
              listed or searchable anywhere.
            </Dialog.Description>

            {share ? (
              <>
                <div className="KeptList KeptDialogList">
                  <div className="KeptListItem KeptFieldStacked">
                    <label className="KeptText1 KeptMuted" htmlFor="kept-board-link">
                      Link
                    </label>
                    <div className="KeptCopyRow">
                      <Input
                        id="kept-board-link"
                        ref={linkRef}
                        className="KeptText1 KeptInput KeptTruncate"
                        readOnly
                        value={boardUrl(share.token)}
                        onFocus={(event) => event.currentTarget.select()}
                      />
                      <Button
                        className="KeptLink KeptText1 KeptButtonReset KeptButtonText1"
                        onClick={copy}
                      >
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                  <div className="KeptListItem KeptFieldStacked">
                    <span className="KeptText1 KeptMuted">Published</span>
                    <span className="KeptText1">
                      {formatDate(share.publishedAt)}
                      {rotated && ' · new link, the old one no longer works'}
                    </span>
                  </div>
                </div>
                <div className="KeptDialogSecondary">
                  <Button
                    className="KeptLink KeptText1 KeptButtonReset KeptButtonText1"
                    disabled={pending}
                    onClick={async () => {
                      await run(() => rotateShare(collection.id));
                      setRotated(true);
                    }}
                  >
                    New link
                  </Button>
                  <Button
                    className="KeptLink KeptText1 KeptButtonReset KeptButtonText1 KeptDanger"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        await unpublishCollection(collection.id);
                        return null;
                      })
                    }
                  >
                    Unpublish
                  </Button>
                </div>
                <div className="KeptDialogActions KeptDialogFooter">
                  <a
                    className="KeptLink KeptLinkArrow KeptText2"
                    href={`/m/${share.token}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open board
                    <ArrowIcon />
                  </a>
                  <Dialog.Close className="KeptLink KeptText2 KeptButtonReset">Done</Dialog.Close>
                </div>
              </>
            ) : (
              <div className="KeptDialogActions KeptDialogFooter">
                <Dialog.Close className="KeptLink KeptText2 KeptButtonReset">Cancel</Dialog.Close>
                <Button
                  className="KeptLink KeptLinkArrow KeptText2 KeptButtonReset"
                  disabled={pending}
                  focusableWhenDisabled
                  onClick={() =>
                    run(() => publishCollection(collection.id, getSession()?.username ?? 'wade'))
                  }
                >
                  {pending ? 'Publishing…' : 'Publish'}
                  <ArrowIcon />
                </Button>
              </div>
            )}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
