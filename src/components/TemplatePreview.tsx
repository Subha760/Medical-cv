import { useEffect, useMemo, useRef, useState } from "react";
import { generateCvPdf } from "../pdf/pdfGenerator";
import { demoCv } from "../data/demoCv";
import PdfPages from "./PdfPages";
export default function TemplatePreview({
  id,
  color,
}: {
  id: string;
  color: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const blob = useMemo(
    () => (visible ? generateCvPdf(demoCv(id, color)) : null),
    [visible, id, color],
  );
  return (
    <div ref={host} className="template-preview">
      {blob ? (
        <PdfPages blob={blob} thumbnail />
      ) : (
        <div className="template-preview-placeholder" aria-hidden="true" />
      )}
    </div>
  );
}
