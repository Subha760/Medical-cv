import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import NavBar from "../components/NavBar";
import { cvStorage } from "../storage/cvStorage";
import { templateById } from "../data/templateCatalog";
import {
  CertificationEntry,
  CustomSection,
  CustomSectionEntry,
  CvDocument,
  EducationEntry,
  ExperienceEntry,
  LanguageEntry,
  SECTION_LABELS,
  newCvDocument,
} from "../types/cv";
import {
  generateProfessionalSummary,
  improveResponsibilities,
  writingTips,
} from "../ai/localWritingAssistant";

const STEPS = [
  "Personal Details",
  "Professional Summary",
  "Education",
  "Experience",
  "Certifications",
  "Achievements",
  "Languages",
  "Additional Sections",
  "Reorder Sections",
] as const;

function uid() {
  return crypto.randomUUID();
}

export default function EditorPage() {
  const { cvId } = useParams<{ cvId: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<CvDocument | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!cvId) return;
    const existing = cvStorage.getById(cvId);
    setDoc(existing ?? newCvDocument(cvId));
  }, [cvId]);

  function update(mutator: (d: CvDocument) => CvDocument) {
    setDoc((prev) => {
      if (!prev) return prev;
      const next = mutator(prev);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => cvStorage.save(next, true), 500);
      return next;
    });
  }

  const step = STEPS[stepIndex];

  const isLastStep = stepIndex === STEPS.length - 1;

  function goNext() {
    if (isLastStep) {
      if (doc) cvStorage.save(doc, false);
      navigate(`/preview/${cvId}`);
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function goBack() {
    if (stepIndex === 0) navigate(-1);
    else setStepIndex((i) => i - 1);
  }

  const progressPct = useMemo(() => ((stepIndex + 1) / STEPS.length) * 100, [stepIndex]);

  if (!doc) {
    return (
      <>
        <NavBar />
        <main className="container" style={{ padding: "48px 24px" }}>
          <p>Loading…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <main className="container" style={{ padding: "32px 24px", maxWidth: 760 }}>
        <div style={{ height: 4, background: "var(--color-line)", borderRadius: 2, marginBottom: 16 }}>
          <div
            style={{
              height: "100%",
              width: `${progressPct}%`,
              background: "var(--color-teal)",
              borderRadius: 2,
              transition: "width 0.2s ease",
            }}
          />
        </div>
        <h2 style={{ font: "var(--text-display)", fontSize: "1.6rem", marginBottom: 20 }}>{step}</h2>

        {step === "Personal Details" && (
          <div>
            <ProfilePhotoField
              photoDataUrl={doc.personalInfo.profilePhotoDataUrl}
              templateSupportsPhoto={templateById(doc.templateId).supportsPhoto}
              onChange={(profilePhotoDataUrl) =>
                update((d) => ({ ...d, personalInfo: { ...d.personalInfo, profilePhotoDataUrl } }))
              }
            />
            <div className="field">
              <label>Full Name</label>
              <input
                value={doc.personalInfo.fullName}
                onChange={(e) => update((d) => ({ ...d, personalInfo: { ...d.personalInfo, fullName: e.target.value } }))}
              />
            </div>
            <div className="field">
              <label>Professional Title (e.g. Staff Nurse, MBBS)</label>
              <input
                value={doc.personalInfo.professionalTitle}
                onChange={(e) =>
                  update((d) => ({ ...d, personalInfo: { ...d.personalInfo, professionalTitle: e.target.value } }))
                }
              />
            </div>
            <div className="field">
              <label>Phone</label>
              <input
                value={doc.personalInfo.phone}
                onChange={(e) => update((d) => ({ ...d, personalInfo: { ...d.personalInfo, phone: e.target.value } }))}
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                value={doc.personalInfo.email}
                onChange={(e) => update((d) => ({ ...d, personalInfo: { ...d.personalInfo, email: e.target.value } }))}
              />
            </div>
            <div className="field">
              <label>City / Country</label>
              <input
                value={doc.personalInfo.cityCountry}
                onChange={(e) =>
                  update((d) => ({ ...d, personalInfo: { ...d.personalInfo, cityCountry: e.target.value } }))
                }
              />
            </div>
          </div>
        )}

        {step === "Professional Summary" && (
          <div>
            <div className="card ai-panel">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <strong>Local writing assistant</strong>
                  <p style={{ color: "var(--color-muted)", fontSize: ".9rem" }}>Works offline. Your CV never leaves this device.</p>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => update((d) => ({
                    ...d,
                    personalInfo: { ...d.personalInfo, professionalSummary: generateProfessionalSummary(d) },
                  }))}
                >
                  Write my summary
                </button>
              </div>
              <ul>{writingTips(doc).map((tip) => <li key={tip}>{tip}</li>)}</ul>
            </div>
            <div className="field">
              <label>Professional Summary</label>
              <textarea
                rows={5}
                value={doc.personalInfo.professionalSummary}
                onChange={(e) =>
                  update((d) => ({ ...d, personalInfo: { ...d.personalInfo, professionalSummary: e.target.value } }))
                }
              />
            </div>
            <div className="field">
              <label>Registration / License Number</label>
              <input
                value={doc.registrationInfo.registrationNumber}
                onChange={(e) =>
                  update((d) => ({ ...d, registrationInfo: { ...d.registrationInfo, registrationNumber: e.target.value } }))
                }
              />
            </div>
            <div className="field">
              <label>Nursing / Medical Council</label>
              <input
                value={doc.registrationInfo.councilOrBoard}
                onChange={(e) =>
                  update((d) => ({ ...d, registrationInfo: { ...d.registrationInfo, councilOrBoard: e.target.value } }))
                }
              />
            </div>
          </div>
        )}

        {step === "Education" && (
          <EducationStep
            entries={doc.education}
            onChange={(education) => update((d) => ({ ...d, education }))}
          />
        )}

        {step === "Experience" && (
          <ExperienceStep
            entries={doc.experience}
            onChange={(experience) => update((d) => ({ ...d, experience }))}
          />
        )}

        {step === "Certifications" && (
          <CertificationsStep
            entries={doc.certifications}
            onChange={(certifications) => update((d) => ({ ...d, certifications }))}
          />
        )}

        {step === "Achievements" && (
          <div>
            <div className="field">
              <label>Achievements (awards, recognitions, notable outcomes)</label>
              <textarea
                rows={5}
                value={doc.achievements}
                onChange={(e) => update((d) => ({ ...d, achievements: e.target.value }))}
              />
            </div>
          </div>
        )}

        {step === "Languages" && (
          <LanguagesStep
            entries={doc.languages}
            onChange={(languages) => update((d) => ({ ...d, languages }))}
          />
        )}

        {step === "Additional Sections" && (
          <AdditionalSectionsStep
            doc={doc}
            onChange={(patch) => update((d) => ({ ...d, ...patch }))}
          />
        )}

        {step === "Reorder Sections" && (
          <ReorderSectionsStep
            order={doc.sectionOrder}
            onChange={(sectionOrder) => update((d) => ({ ...d, sectionOrder }))}
          />
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32 }}>
          <button className="btn btn-ghost" onClick={goBack}>
            Back
          </button>
          <button className="btn btn-primary" onClick={goNext}>
            {isLastStep ? "Preview" : "Save & Continue"}
          </button>
        </div>
      </main>
    </>
  );
}

function EducationStep({
  entries,
  onChange,
}: {
  entries: EducationEntry[];
  onChange: (entries: EducationEntry[]) => void;
}) {
  function addEntry() {
    onChange([
      ...entries,
      { id: uid(), degree: "", institution: "", location: "", startYear: "", graduationYear: "", grade: "" },
    ]);
  }

  function updateEntry(id: string, patch: Partial<EducationEntry>) {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function removeEntry(id: string) {
    onChange(entries.filter((e) => e.id !== id));
  }

  return (
    <div>
      {entries.map((entry) => (
        <div key={entry.id} className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div className="field">
            <label>Degree</label>
            <input value={entry.degree} onChange={(e) => updateEntry(entry.id, { degree: e.target.value })} />
          </div>
          <div className="field">
            <label>Institution</label>
            <input value={entry.institution} onChange={(e) => updateEntry(entry.id, { institution: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Start Year</label>
              <input value={entry.startYear} onChange={(e) => updateEntry(entry.id, { startYear: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Graduation Year</label>
              <input
                value={entry.graduationYear}
                onChange={(e) => updateEntry(entry.id, { graduationYear: e.target.value })}
              />
            </div>
          </div>
          <button className="btn btn-ghost" onClick={() => removeEntry(entry.id)}>
            Delete
          </button>
        </div>
      ))}
      <button className="btn btn-secondary" onClick={addEntry}>
        Add Education
      </button>
    </div>
  );
}

function ExperienceStep({
  entries,
  onChange,
}: {
  entries: ExperienceEntry[];
  onChange: (entries: ExperienceEntry[]) => void;
}) {
  function addEntry() {
    onChange([
      ...entries,
      {
        id: uid(),
        hospital: "",
        department: "",
        position: "",
        specialty: "",
        startDate: "",
        endDate: "",
        responsibilities: "",
        clinicalSkills: [],
        achievements: "",
      },
    ]);
  }

  function updateEntry(id: string, patch: Partial<ExperienceEntry>) {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function removeEntry(id: string) {
    onChange(entries.filter((e) => e.id !== id));
  }

  return (
    <div>
      {entries.map((entry) => (
        <div key={entry.id} className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div className="field">
            <label>Hospital / Facility</label>
            <input value={entry.hospital} onChange={(e) => updateEntry(entry.id, { hospital: e.target.value })} />
          </div>
          <div className="field">
            <label>Position</label>
            <input value={entry.position} onChange={(e) => updateEntry(entry.id, { position: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Start Date</label>
              <input value={entry.startDate} onChange={(e) => updateEntry(entry.id, { startDate: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>End Date (or Present)</label>
              <input value={entry.endDate} onChange={(e) => updateEntry(entry.id, { endDate: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Responsibilities</label>
            <textarea
              rows={3}
              value={entry.responsibilities}
              onChange={(e) => updateEntry(entry.id, { responsibilities: e.target.value })}
            />
            <button
              className="btn btn-secondary"
              style={{ alignSelf: "flex-start" }}
              onClick={() => updateEntry(entry.id, {
                responsibilities: improveResponsibilities(entry.responsibilities, entry),
              })}
            >
              Improve with local assistant
            </button>
          </div>
          <button className="btn btn-ghost" onClick={() => removeEntry(entry.id)}>
            Delete
          </button>
        </div>
      ))}
      <button className="btn btn-secondary" onClick={addEntry}>
        Add Clinical Experience
      </button>
    </div>
  );
}

const COMMON_CERTIFICATIONS = ["BLS", "ACLS", "PALS", "Infection Control", "First Aid"];

function CertificationsStep({
  entries,
  onChange,
}: {
  entries: CertificationEntry[];
  onChange: (entries: CertificationEntry[]) => void;
}) {
  function addEntry(name = "") {
    onChange([...entries, { id: uid(), name, issuingBody: "", issueDate: "", expiryDate: "" }]);
  }

  function updateEntry(id: string, patch: Partial<CertificationEntry>) {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function removeEntry(id: string) {
    onChange(entries.filter((e) => e.id !== id));
  }

  return (
    <div>
      <p style={{ color: "var(--color-muted)", marginBottom: 8 }}>Quick add</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {COMMON_CERTIFICATIONS.map((name) => (
          <button key={name} className="chip" onClick={() => addEntry(name)}>
            {name}
          </button>
        ))}
      </div>

      {entries.map((entry) => (
        <div key={entry.id} className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div className="field">
            <label>Certification Name</label>
            <input value={entry.name} onChange={(e) => updateEntry(entry.id, { name: e.target.value })} />
          </div>
          <div className="field">
            <label>Issuing Body</label>
            <input value={entry.issuingBody} onChange={(e) => updateEntry(entry.id, { issuingBody: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Issue Date</label>
              <input value={entry.issueDate} onChange={(e) => updateEntry(entry.id, { issueDate: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Expiry (optional)</label>
              <input value={entry.expiryDate} onChange={(e) => updateEntry(entry.id, { expiryDate: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-ghost" onClick={() => removeEntry(entry.id)}>
            Delete
          </button>
        </div>
      ))}
      <button className="btn btn-secondary" onClick={() => addEntry()}>
        Add Certification
      </button>
    </div>
  );
}

function LanguagesStep({
  entries,
  onChange,
}: {
  entries: LanguageEntry[];
  onChange: (entries: LanguageEntry[]) => void;
}) {
  function addEntry() {
    onChange([...entries, { id: uid(), language: "", proficiency: "" }]);
  }

  function updateEntry(id: string, patch: Partial<LanguageEntry>) {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function removeEntry(id: string) {
    onChange(entries.filter((e) => e.id !== id));
  }

  return (
    <div>
      {entries.map((entry) => (
        <div key={entry.id} className="card" style={{ padding: 16, marginBottom: 12, display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Language</label>
            <input value={entry.language} onChange={(e) => updateEntry(entry.id, { language: e.target.value })} />
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Proficiency</label>
            <input value={entry.proficiency} onChange={(e) => updateEntry(entry.id, { proficiency: e.target.value })} />
          </div>
          <button className="btn btn-ghost" onClick={() => removeEntry(entry.id)}>
            Remove
          </button>
        </div>
      ))}
      <button className="btn btn-secondary" onClick={addEntry}>
        Add Language
      </button>
    </div>
  );
}

function AdditionalSectionsStep({
  doc,
  onChange,
}: {
  doc: CvDocument;
  onChange: (patch: Partial<CvDocument>) => void;
}) {
  function addCustomSection() {
    const section: CustomSection = { id: uid(), title: "New Section", entries: [] };
    onChange({ customSections: [...doc.customSections, section] });
  }

  function updateSection(id: string, patch: Partial<CustomSection>) {
    onChange({ customSections: doc.customSections.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  }

  function removeSection(id: string) {
    onChange({ customSections: doc.customSections.filter((s) => s.id !== id) });
  }

  function addSectionEntry(sectionId: string) {
    const entry: CustomSectionEntry = { id: uid(), heading: "", description: "", date: "", location: "" };
    const section = doc.customSections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, { entries: [...section.entries, entry] });
  }

  function updateSectionEntry(sectionId: string, entryId: string, patch: Partial<CustomSectionEntry>) {
    const section = doc.customSections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, {
      entries: section.entries.map((e) => (e.id === entryId ? { ...e, ...patch } : e)),
    });
  }

  function removeSectionEntry(sectionId: string, entryId: string) {
    const section = doc.customSections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, { entries: section.entries.filter((e) => e.id !== entryId) });
  }

  return (
    <div>
      <div className="field">
        <label>Publications</label>
        <textarea rows={2} value={doc.publications} onChange={(e) => onChange({ publications: e.target.value })} />
      </div>
      <div className="field">
        <label>Conferences / Workshops</label>
        <textarea rows={2} value={doc.conferences} onChange={(e) => onChange({ conferences: e.target.value })} />
      </div>
      <div className="field">
        <label>Professional Memberships</label>
        <textarea rows={2} value={doc.memberships} onChange={(e) => onChange({ memberships: e.target.value })} />
      </div>
      <div className="field">
        <label>References</label>
        <textarea rows={2} value={doc.references} onChange={(e) => onChange({ references: e.target.value })} />
      </div>

      <div style={{ height: 1, background: "var(--color-line)", margin: "20px 0" }} />
      <p style={{ fontWeight: 600, marginBottom: 12 }}>Custom Sections</p>

      {doc.customSections.map((section) => (
        <div key={section.id} className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div className="field">
            <label>Section Title (e.g. "Clinical Rotations", "Research Experience")</label>
            <input value={section.title} onChange={(e) => updateSection(section.id, { title: e.target.value })} />
          </div>

          {section.entries.map((entry) => (
            <div key={entry.id} style={{ marginBottom: 12, paddingLeft: 12, borderLeft: "2px solid var(--color-line)" }}>
              <div className="field">
                <label>Heading</label>
                <input value={entry.heading} onChange={(e) => updateSectionEntry(section.id, entry.id, { heading: e.target.value })} />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea
                  rows={2}
                  value={entry.description}
                  onChange={(e) => updateSectionEntry(section.id, entry.id, { description: e.target.value })}
                />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Date</label>
                  <input value={entry.date} onChange={(e) => updateSectionEntry(section.id, entry.id, { date: e.target.value })} />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Location</label>
                  <input value={entry.location} onChange={(e) => updateSectionEntry(section.id, entry.id, { location: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-ghost" onClick={() => removeSectionEntry(section.id, entry.id)}>
                Remove Entry
              </button>
            </div>
          ))}

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => addSectionEntry(section.id)}>
              Add Entry
            </button>
            <button className="btn btn-ghost" onClick={() => removeSection(section.id)}>
              Delete Section
            </button>
          </div>
        </div>
      ))}

      <button className="btn btn-secondary" onClick={addCustomSection} style={{ marginBottom: 24 }}>
        Add Custom Section
      </button>

      <div style={{ height: 1, background: "var(--color-line)", margin: "20px 0" }} />
      <div className="field">
        <label>Save this CV as</label>
        <input
          placeholder='e.g. "Staff Nurse — Bangalore"'
          value={doc.label}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </div>
    </div>
  );
}

const MAX_PHOTO_DIMENSION = 480;

function ProfilePhotoField({
  photoDataUrl,
  templateSupportsPhoto,
  onChange,
}: {
  photoDataUrl: string | null;
  templateSupportsPhoto: boolean;
  onChange: (dataUrl: string | null) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    // Downscale before storing — localStorage has a small per-origin quota
    // (typically ~5-10MB across everything saved), and a full-resolution
    // photo per CV would eat through it fast. The photo never leaves this
    // resize step; it's still never uploaded anywhere.
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setError("Couldn't process that image.");
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        onChange(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => setError("Couldn't read that image.");
      img.src = reader.result as string;
    };
    reader.onerror = () => setError("Couldn't read that file.");
    reader.readAsDataURL(file);
  }

  return (
    <div className="field">
      <label>Profile Photo (optional)</label>
      {!templateSupportsPhoto && (
        <p style={{ color: "var(--color-muted)", fontSize: "0.85rem", margin: "0 0 8px" }}>
          The template you picked doesn't display a photo — it'll be saved but won't appear
          on the exported PDF unless you switch to a photo-supporting template.
        </p>
      )}
      {photoDataUrl ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={photoDataUrl}
            alt="Profile"
            style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--color-line)" }}
          />
          <button className="btn btn-ghost" onClick={() => onChange(null)}>
            Remove
          </button>
        </div>
      ) : (
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      )}
      {error && <p style={{ color: "var(--color-error)", fontSize: "0.85rem", margin: "4px 0 0" }}>{error}</p>}
    </div>
  );
}

function ReorderSectionsStep({
  order,
  onChange,
}: {
  order: string[];
  onChange: (order: string[]) => void;
}) {
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div>
      <p style={{ color: "var(--color-muted)", marginBottom: 16 }}>
        Choose the order sections appear in on the exported PDF. Sections with no content are
        skipped automatically, so it's fine to leave empty ones in whatever position.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {order.map((key, index) => (
          <div
            key={key}
            className="card"
            style={{
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>{SECTION_LABELS[key] ?? key}</span>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                className="btn btn-ghost"
                style={{ padding: "4px 10px" }}
                disabled={index === 0}
                onClick={() => move(index, -1)}
                aria-label={`Move ${SECTION_LABELS[key] ?? key} up`}
              >
                ↑
              </button>
              <button
                className="btn btn-ghost"
                style={{ padding: "4px 10px" }}
                disabled={index === order.length - 1}
                onClick={() => move(index, 1)}
                aria-label={`Move ${SECTION_LABELS[key] ?? key} down`}
              >
                ↓
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
