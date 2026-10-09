/* Download adapter: triggers the PNG fallback and releases object URLs. */

                                      
                      
                                                                       
                                           
                                          
 

export function createDownloader(environment                      = {})                                         {
  const doc = environment.document ?? (typeof document === 'undefined' ? undefined : document);
  const create = environment.createObjectUrl ?? ((blob      ) => URL.createObjectURL(blob));
  const revoke = environment.revokeObjectUrl ?? ((url        ) => URL.revokeObjectURL(url));
  let lastUrl                = null;

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
