import * as React from 'react';
import { Button } from '@base-ui/react/button';
import { Dialog } from '@base-ui/react/dialog';
import { Field } from '@base-ui/react/field';
import { Input } from '@base-ui/react/input';
import { Select } from '@base-ui/react/select';
import {
  deleteLabItem,
  listLabItems,
  promoteLabItem,
  saveLabItem,
  type LabCategory,
  type LabItem,
} from './labRepository.ts';
import { ArrowIcon, Separator } from './parts.tsx';
import { formatDate } from './utils.ts';

const SECTIONS: { value: LabCategory; label: string; description: string }[] = [
  { value: 'reference', label: 'References', description: 'Things worth studying.' },
  { value: 'experiment', label: 'Experiments', description: 'Small things to prototype or test.' },
  { value: 'concept', label: 'Concepts', description: 'Ideas to think through before they become commitments.' },
  { value: 'ios', label: 'iOS / Native', description: 'Native capture, library, and interaction ideas.' },
];

export function KeptLab() {
  const [items, setItems] = React.useState(listLabItems);
  const [category, setCategory] = React.useState<LabCategory>('reference');
  const visible = items.filter((item) => item.category === category);
  const section = SECTIONS.find((candidate) => candidate.value === category)!;

  const refresh = () => setItems([...listLabItems()]);

  return (
    <>
      <section className="KeptContents">
        <h1 className="KeptDisplay KeptCol-hero">Lab</h1>
      </section>

      <section className="KeptContents">
        <p className="KeptText2 KeptCol-body">
          Unfinished ideas, references, and experiments live here while they are being investigated.
          Nothing in Lab is a roadmap commitment.
        </p>
      </section>

      <Separator />
      <section className="KeptContents" aria-labelledby="kept-lab-browse">
        <div className="KeptStack KeptStack-0 KeptCol-label">
          <h2 id="kept-lab-browse" className="KeptText2">Browse</h2>
          <span className="KeptText1 KeptMuted">{items.length} saved</span>
        </div>
        <div className="KeptCol-body KeptStack KeptStack-4 KeptStretch">
          <nav className="KeptLabNav" aria-label="Lab sections">
            {SECTIONS.map((candidate) => (
              <Button
                key={candidate.value}
                className="KeptSegmentedItem"
                data-pressed={candidate.value === category || undefined}
                aria-pressed={candidate.value === category}
                onClick={() => setCategory(candidate.value)}
              >
                {candidate.label}
              </Button>
            ))}
          </nav>
          <LabItemDialog
            category={category}
            onSaved={(item) => {
              refresh();
              setCategory(item.category);
            }}
          />
        </div>
      </section>

      <Separator />
      <section className="KeptContents" aria-labelledby="kept-lab-section">
        <div className="KeptStack KeptStack-0 KeptCol-label">
          <h2 id="kept-lab-section" className="KeptText2">{section.label.toUpperCase()}</h2>
          <span className="KeptText1 KeptMuted">{section.description}</span>
        </div>
        <div className="KeptCol-body">
          {visible.length > 0 ? (
            <ul className="KeptList">
              {visible.map((item) => (
                <LabItemRow
                  key={item.id}
                  item={item}
                  onChanged={refresh}
                />
              ))}
            </ul>
          ) : (
            <p className="KeptText1 KeptMuted">Nothing saved here yet.</p>
          )}
        </div>
      </section>
    </>
  );
}

function LabItemRow({ item, onChanged }: { item: LabItem; onChanged: () => void }) {
  return (
    <li className="KeptListItem KeptLabRow">
      <div className="KeptStack KeptStack-0 KeptLabMain">
        {item.url ? (
          <a className="KeptLink KeptText2 KeptLabTitle" href={item.url} target="_blank" rel="noreferrer">
            {item.title}
          </a>
        ) : (
          <span className="KeptText2 KeptLabTitle">{item.title}</span>
        )}
        {item.note && <span className="KeptText1 KeptMuted">{item.note}</span>}
        {item.tags && item.tags.length > 0 && (
          <span className="KeptText1 KeptMuted">{item.tags.join(' · ')}</span>
        )}
      </div>
      <div className="KeptStack KeptStack-0 KeptLabMeta">
        <span className="KeptText1 KeptMuted">
          {[item.source, item.status, formatDate(item.createdAt)].filter(Boolean).join(' · ')}
        </span>
        <span className="KeptLabActions">
          <LabItemDialog item={item} category={item.category} onSaved={onChanged} />
          {item.status !== 'promoted' && (
            <Button
              className="KeptLink KeptText1 KeptButtonReset KeptButtonText1 KeptMuted"
              onClick={() => {
                promoteLabItem(item.id);
                onChanged();
              }}
            >
              Promote to roadmap
            </Button>
          )}
          <Button
            className="KeptLink KeptText1 KeptButtonReset KeptButtonText1 KeptMuted"
            onClick={() => {
              deleteLabItem(item.id);
              onChanged();
            }}
          >
            Delete
          </Button>
        </span>
      </div>
    </li>
  );
}

function LabItemDialog({
  item,
  category,
  onSaved,
}: {
  item?: LabItem;
  category: LabCategory;
  onSaved: (item: LabItem) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<LabCategory>(item?.category ?? category);

  React.useEffect(() => {
    if (!open) setSelectedCategory(item?.category ?? category);
  }, [category, item?.category, open]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className={`KeptLink KeptButtonReset KeptButtonText1${item ? ' KeptText1 KeptMuted' : ' KeptText2 KeptLinkArrow'}`}>
        {item ? 'Edit' : 'Add item'}
        {!item && <ArrowIcon />}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="KeptDialogBackdrop" />
        <Dialog.Viewport className="KeptDialogViewport">
          <Dialog.Popup className="KeptDialogPopup KeptLabDialog">
            <Dialog.Title className="KeptText2">{item ? 'Edit Lab item' : 'Add to Lab'}</Dialog.Title>
            <Dialog.Description className="KeptText1 KeptMuted">
              Save something to investigate. It will stay separate from the roadmap.
            </Dialog.Description>
            <form
              className="KeptForm"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const tags = String(data.get('tags') ?? '')
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean);
                const saved = saveLabItem({
                  id: item?.id,
                  title: String(data.get('title') ?? '').trim(),
                  url: String(data.get('url') ?? '').trim() || undefined,
                  note: String(data.get('note') ?? '').trim() || undefined,
                  category: selectedCategory,
                  tags: tags.length > 0 ? tags : undefined,
                  status: item?.status ?? 'saved',
                });
                onSaved(saved);
                setOpen(false);
              }}
            >
              <div className="KeptList">
                <LabField label="Title">
                  <Input name="title" required maxLength={120} autoComplete="off" defaultValue={item?.title} className="KeptText2 KeptInput" />
                </LabField>
                <LabField label="URL">
                  <Input name="url" type="url" autoComplete="url" defaultValue={item?.url} placeholder="https://" className="KeptText2 KeptInput" />
                </LabField>
                <LabField label="Note">
                  <textarea name="note" maxLength={500} defaultValue={item?.note} className="KeptText2 KeptInput KeptTextarea KeptTextareaShort" />
                </LabField>
                <div className="KeptListItem KeptField KeptFieldStacked">
                  <span className="KeptText1 KeptMuted">Category</span>
                  <Select.Root
                    items={SECTIONS.map(({ value, label }) => ({ value, label }))}
                    value={selectedCategory}
                    onValueChange={(value) => value && setSelectedCategory(value as LabCategory)}
                  >
                    <Select.Trigger className="KeptText2 KeptSelectTrigger">
                      <Select.Value />
                      <Select.Icon aria-hidden>↕</Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Positioner className="KeptSelectPositioner" sideOffset={4} align="start">
                        <Select.Popup className="KeptSelectPopup">
                          <Select.List>
                            {SECTIONS.map(({ value, label }) => (
                              <Select.Item key={value} value={value} className="KeptText1 KeptSelectItem">
                                <Select.ItemIndicator aria-hidden>✓</Select.ItemIndicator>
                                <Select.ItemText>{label}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.List>
                        </Select.Popup>
                      </Select.Positioner>
                    </Select.Portal>
                  </Select.Root>
                </div>
                <LabField label="Tags">
                  <Input name="tags" autoComplete="off" defaultValue={item?.tags?.join(', ')} placeholder="Comma separated" className="KeptText2 KeptInput" />
                </LabField>
              </div>
              <div className="KeptDialogActions">
                <Dialog.Close className="KeptLink KeptText2 KeptButtonReset">Cancel</Dialog.Close>
                <Button type="submit" className="KeptLink KeptLinkArrow KeptText2 KeptButtonReset">
                  {item ? 'Save changes' : 'Add item'}
                  <ArrowIcon />
                </Button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function LabField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Field.Root className="KeptListItem KeptField KeptFieldStacked">
      <Field.Label className="KeptText1 KeptMuted">{label}</Field.Label>
      <div className="KeptFieldBody">{children}</div>
    </Field.Root>
  );
}
