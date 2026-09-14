// Android 10's original WebView predates Array/String.prototype.at.
if (!Array.prototype.at) {
  Object.defineProperty(Array.prototype, 'at', {
    value(index: number) { const i=index < 0 ? this.length + index : index; return this[i]; },
    configurable: true,
    writable: true,
  });
}
if (!String.prototype.at) {
  Object.defineProperty(String.prototype, 'at', {
    value(index: number) { const i=index < 0 ? this.length + index : index; return this.charAt(i) || undefined; },
    configurable: true,
    writable: true,
  });
}
await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
