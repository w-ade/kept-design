import * as React from 'react';

export function boardUrl(token: string) {
  return `${window.location.origin}/m/${token}`;
}

export function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function formatDate(iso: string) {
  return dateFormat.format(new Date(`${iso}T12:00:00`));
}

// Pages with data-driven titles set their own; KeptApp covers the static ones.
export function useDocumentTitle(title: string | undefined) {
  React.useEffect(() => {
    if (title) document.title = title;
  }, [title]);
}

// "fontsinuse.com" for a captured URL, "Uploaded" for a file from disk
export function sourceLabel(captureUrl: string | null) {
  if (!captureUrl) return 'Uploaded';
  try {
    return new URL(captureUrl).hostname.replace(/^www\./, '');
  } catch {
    return captureUrl;
  }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

// Full images keep their real shape so pins land where they were dropped; placeholders stay square.
export function fullImageStyle(r: { imageUrl?: string; width: number; height: number }) {
  const aspect = r.imageUrl ? r.width / r.height : 1;
  return {
    aspectRatio: String(aspect),
    '--kept-aspect': String(aspect),
  } as React.CSSProperties;
}
