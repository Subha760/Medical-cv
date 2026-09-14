// Android 10's original WebView predates Array/String.prototype.at.
const arrayPrototype = Array.prototype as unknown as { at?: (index: number) => unknown };
const stringPrototype = String.prototype as unknown as { at?: (index: number) => string | undefined };
if (!arrayPrototype.at) {
  Object.defineProperty(arrayPrototype, 'at', {
    value(this: unknown[], index: number) { const i=index < 0 ? this.length + index : index; return this[i]; },
    configurable: true,
    writable: true,
  });
}
if (!stringPrototype.at) {
  Object.defineProperty(stringPrototype, 'at', {
    value(this: string, index: number) { const i=index < 0 ? this.length + index : index; return this.charAt(i) || undefined; },
    configurable: true,
    writable: true,
  });
}
// @ts-expect-error pdf.js ships its worker as JavaScript without a declaration file.
await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
export {};
