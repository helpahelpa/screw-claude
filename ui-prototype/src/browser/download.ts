/* Download adapter: triggers the PNG fallback and releases object URLs. */

export interface DownloadEnvironment {
  document?: Document;
  /** Injected for tests; defaults to the global URL implementation. */
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
}

export function createDownloader(environment: DownloadEnvironment = {}): (blob: Blob, fileName: string) => void {
  const doc = environment.document ?? (typeof document === 'undefined' ? undefined : document);
  const create = environment.createObjectUrl ?? ((blob: Blob) => URL.createObjectURL(blob));
  const revoke = environment.revokeObjectUrl ?? ((url: string) => URL.revokeObjectURL(url));
  let lastUrl: string | null = null;

  return (blob, fileName) => {
    if (!doc) throw new Error('Download needs a document');
    if (lastUrl) {
      revoke(lastUrl);
      lastUrl = null;
    }
    const url = create(blob);
    lastUrl = url;
    const link = doc.createElement('a');
    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    doc.body.appendChild(link);
    link.click();
    link.remove();
    // Give the browser time to start the download, then release the URL.
    setTimeout(() => {
      revoke(url);
      if (lastUrl === url) lastUrl = null;
    }, 10_000);
  };
}
