/**
 * Triggers a browser download for in-memory content.
 * @param {Blob|string} content
 * @param {string} filename
 * @param {string} [mimeType] - used when content is a string
 */
export function downloadBlob(content, filename, mimeType = 'application/octet-stream') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
