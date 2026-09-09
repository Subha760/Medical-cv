import { useMemo } from 'react';
import { generateCvPdf } from '../pdf/pdfGenerator';
import { demoCv } from '../data/demoCv';
import PdfPages from './PdfPages';
export default function TemplatePreview({id,color}:{id:string;color:string}) {
  const blob=useMemo(()=>generateCvPdf(demoCv(id,color)),[id,color]);
  return <PdfPages blob={blob} thumbnail/>;
}
