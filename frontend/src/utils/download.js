/**
 * Save a Blob as a file via a temporary, hidden <a download> element.
 * The href is always a blob: URL created here, and the file name is stripped of path and control characters.
 */
export function downloadBlob(blob, filename) {
  const safeName = String(filename).replaceAll(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', safeName);
  a.style.display = 'none';
  document.body.append(a);
  a.click();
  // Delayed so the browser has started the download before the URL is released
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 100);
}
