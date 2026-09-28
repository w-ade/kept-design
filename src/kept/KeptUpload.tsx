import * as React from 'react';
import { Button } from '@base-ui/react/button';
import { Dialog } from '@base-ui/react/dialog';
import { addUploads, type Collection, type Reference, type UploadStatus } from './repository.ts';

interface Item {
  id: string;
  name: string;
  status: UploadStatus | 'waiting';
}

const STATUS: Record<Item['status'], string> = {
  waiting: 'Waiting',
  adding: 'Adding…',
  added: 'Added',
  failed: 'Couldn’t read this file',
};

// Add images to a collection. On a phone, "Choose images" opens the photo picker
// (library, camera or files); on desktop, images can also be dropped on the dialog.
export function UploadDialog({
  collection,
  onAdded,
}: {
  collection: Collection;
  onAdded: (references: Reference[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Item[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const add = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(
      (f) => f.type.startsWith('image/') || /\.(heic|heif|avif)$/i.test(f.name),
    );
    if (files.length === 0 || busy) return;
    setItems(
      files.map((file, index) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
        name: file.name,
        status: 'waiting',
      })),
    );
    setBusy(true);
    let added: Reference[];
    try {
      added = await addUploads(collection.id, files, (index, status) =>
        setItems((current) => current.map((item, i) => (i === index ? { ...item, status } : item))),
      );
    } finally {
      setBusy(false);
    }
    if (added.length > 0) onAdded(added);
  };

  const done = items.filter((i) => i.status === 'added').length;
  const failed = items.filter((i) => i.status === 'failed').length;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        // Don't close halfway through adding.
        if (!next && busy) return;
        setOpen(next);
      }}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) setItems([]);
      }}
    >
      <Dialog.Trigger className="KeptLink KeptLinkArrow KeptText1 KeptButtonReset KeptButtonText1">
        Add images
        <PlusIcon />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="KeptDialogBackdrop" />
        <Dialog.Viewport className="KeptDialogViewport">
          <Dialog.Popup
            className="KeptDialogPopup"
            data-dragging={dragging || undefined}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void add(event.dataTransfer.files);
            }}
          >
            <Dialog.Title className="KeptText2">Add images to {collection.name}</Dialog.Title>
            <Dialog.Description className="KeptText1 KeptMuted">
              Photos, screenshots or saved images. In the lab they're kept on this device only.
            </Dialog.Description>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                if (event.target.files) void add(event.target.files);
                event.target.value = '';
              }}
            />
            <div className="KeptDropzone">
              <Button
                className="KeptLink KeptLinkArrow KeptText2 KeptButtonReset"
                disabled={busy}
                focusableWhenDisabled
                onClick={() => inputRef.current?.click()}
              >
                {items.length > 0 && !busy ? 'Choose more' : 'Choose images'}
                <PlusIcon />
              </Button>
              <span className="KeptText1 KeptMuted KeptDropHint">or drop them here</span>
            </div>

            {items.length > 0 && (
              <>
                <p className="KeptText1" role="status">
                  {busy
                    ? `Adding ${Math.min(done + failed + 1, items.length)} of ${items.length}…`
                    : `Added ${done} of ${items.length}.${failed ? ` ${failed} couldn’t be read.` : ''}`}
                </p>
                <ul className="KeptList KeptUploadList">
                  {items.map((item) => (
                    <li key={item.id} className="KeptListItem KeptUploadRow">
                      <span className="KeptText1 KeptTruncate">{item.name}</span>
                      <span
                        className="KeptText1 KeptMuted KeptUploadStatus"
                        data-status={item.status}
                      >
                        {STATUS[item.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="KeptDialogActions KeptDialogFooter">
              <span />
              <Dialog.Close
                className="KeptLink KeptText2 KeptButtonReset"
                disabled={busy}
              >
                Done
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
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
