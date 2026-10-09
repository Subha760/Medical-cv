import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import PdfPages from "../components/PdfPages";
import { CvTemplate, TEMPLATE_CATALOG } from "../data/templateCatalog";
import { cvStorage } from "../storage/cvStorage";
import { demoCv } from "../data/demoCv";
import { generateCvPdf } from "../pdf/pdfGenerator";
import { newCvDocument } from "../types/cv";
import { createId } from "../utils/id";
export default function CustomDesignPage() {
  const navigate = useNavigate();
  const [design, setDesign] = useState<CvTemplate>({
      ...TEMPLATE_CATALOG[0],
      id: "custom_" + createId(),
      displayName: "My professional design",
      description: "Your custom original CV layout.",
    }),
    [color, setColor] = useState("navy"),
    [selected, setSelected] = useState(""),
    [error, setError] = useState("");
  const options = {
    layout: [
      "classic",
      "compact",
      "sidebar",
      "timeline",
      "banded",
      "editorial",
      "right-sidebar",
      "ledger",
      "cards",
      "split",
    ],
    header: [
      "left",
      "center",
      "split",
      "banner",
      "monogram",
      "masthead",
      "boxed",
    ],
    headingStyle: [
      "rule",
      "bar",
      "plain",
      "numbered",
      "outline",
      "caps",
      "tab",
      "double",
    ],
    fontStyle: ["sans", "serif", "condensed", "mono"],
    density: ["airy", "balanced", "dense"],
  };
  const preview = useMemo(() => {
    const d = demoCv(TEMPLATE_CATALOG[0].id, color);
    d.templateId = design.id;
    d.customTemplate = design;
    return generateCvPdf(d);
  }, [design, color]);
  function apply() {
    try {
      const id = selected || createId();
      const d =
        (selected ? cvStorage.getById(selected) : null) ||
        newCvDocument(id, "NURSE");
      cvStorage.save(
        {
          ...d,
          templateId: design.id,
          customTemplate: {
            ...design,
            isAtsFriendly: design.layout === "classic",
          },
          colorId: color,
        },
        true,
      );
      navigate("/editor/" + id);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <NavBar />
      <main className="container studio-page">
        <p className="eyebrow">Design your own · free</p>
        <h1>A layout that feels like you.</h1>
        <p>
          Mix structure, headings, type and spacing. The live preview uses
          sample information; your CV text stays unchanged when you apply a
          design.
        </p>
        {error && <p role="alert">{error}</p>}
        <div className="preview-grid">
          <section className="card studio-panel">
            <label>
              Design name
              <input
                maxLength={80}
                value={design.displayName}
                onChange={(e) =>
                  setDesign({ ...design, displayName: e.target.value })
                }
              />
            </label>
            {Object.entries(options).map(([key, values]) => (
              <label key={key}>
                {key}
                <select
                  value={design[key as keyof CvTemplate] as string}
                  onChange={(e) =>
                    setDesign({ ...design, [key]: e.target.value })
                  }
                >
                  {values.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              Accent
              <select value={color} onChange={(e) => setColor(e.target.value)}>
                {[
                  "navy",
                  "teal",
                  "blue",
                  "green",
                  "purple",
                  "maroon",
                  "black",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Apply to
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">New CV</option>
                {cvStorage.listSaved().map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label || d.personalInfo.fullName || "Saved CV"}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn btn-primary" onClick={apply}>
              Apply custom design
            </button>
            <p>
              Backup exports include this custom layout so it can be restored on
              another device.
            </p>
          </section>
          <section>
            <PdfPages blob={preview} />
          </section>
        </div>
      </main>
    </>
  );
}
