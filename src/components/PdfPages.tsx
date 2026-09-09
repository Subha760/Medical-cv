import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentLoadingTask } from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?worker';

let sharedWorker: Worker | undefined;
function readPdf(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

// Render the actual exported PDF, including on mobile browsers without a PDF plugin.
export default function PdfPages({ blob, thumbnail=false }: { blob: Blob; thumbnail?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [error,setError] = useState('');
  useEffect(() => {
    const node=host.current!;
    let cancelled=false;
    let task: PDFDocumentLoadingTask | undefined;
    let started=false;
    node.textContent=''; setError('');
    async function render() {
      if(started) return; started=true;
      try {
        const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
        if(cancelled) return;
        sharedWorker ??= new PdfWorker();
        pdfjs.GlobalWorkerOptions.workerPort=sharedWorker;
        task=pdfjs.getDocument({data:new Uint8Array(await readPdf(blob)), useSystemFonts:true, isEvalSupported:false});
        const pdf=await task.promise;
        for(let i=1;i<=(thumbnail ? 1 : pdf.numPages);i++) {
          if(cancelled) break;
          const page=await pdf.getPage(i);
          const canvas=document.createElement('canvas');
          const viewport=page.getViewport({scale:thumbnail ? .8 : 1.5});
          canvas.width=Math.ceil(viewport.width); canvas.height=Math.ceil(viewport.height);
          canvas.setAttribute('role','img'); canvas.setAttribute('aria-label',`CV page ${i} of ${pdf.numPages}`);
          await page.render({canvasContext:canvas.getContext('2d')!, viewport}).promise;
          if(!cancelled) node.appendChild(canvas);
          page.cleanup();
        }
      } catch { if(!cancelled) setError('Preview could not load. You can still download the PDF.'); }
    }
    const observer=new IntersectionObserver(entries => { if(entries.some(e=>e.isIntersecting)) { observer.disconnect(); void render(); } },{rootMargin:'150px'});
    observer.observe(node);
    return () => {cancelled=true;observer.disconnect();void task?.destroy();};
  },[blob,thumbnail]);
  return <div className={`pdf-pages ${thumbnail ? 'pdf-pages--thumbnail' : ''}`}><div ref={host}/>{error && <p role="alert">{error}</p>}</div>;
}
