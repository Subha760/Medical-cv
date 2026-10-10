import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CvDocument,
  newCvDocument,
  PROFESSION_LABELS,
  Profession,
} from "../types/cv";
import { cvStorage } from "../storage/cvStorage";
import { createId } from "../utils/id";
import Robot from "./Robot";
import { useAccount } from "../account/useAccount";
import { TEMPLATE_CATALOG, isFreeTemplate } from "../data/templateCatalog";
import { unlockedPremiumById } from "../data/templateRegistry";
import { validCustom } from "../data/customTemplates";

type Question = { path: string; label: string; photo?: boolean };
const labels: Record<string, string> = {
  fullName: "What is your full name?",
  professionalTitle: "What professional title should appear under your name?",
  phone: "Your phone number?",
  email: "Your professional email?",
  cityCountry: "Your city and country?",
  professionalSummary: "How would you introduce yourself professionally?",
  profilePhotoDataUrl: "Would you like to add a profile photo?",
  linkedInUrl: "Your LinkedIn URL?",
  professionalWebsite: "Your professional website?",
  dateOfBirth: "Date of birth, if required for your application?",
  maritalStatus: "Marital status, if you wish to include it?",
  nationality: "Nationality, if relevant?",
  fullAddress: "Address, if needed?",
  caste: "Caste, only if required for your application?",
  religion: "Religion, only if required for your application?",
};
const entryShapes = {
  education: {
    degree: "",
    institution: "",
    location: "",
    startYear: "",
    graduationYear: "",
    grade: "",
  },
  experience: {
    hospital: "",
    department: "",
    position: "",
    specialty: "",
    startDate: "",
    endDate: "",
    responsibilities: "",
    clinicalSkills: [] as string[],
    achievements: "",
  },
  certifications: { name: "", issuingBody: "", issueDate: "", expiryDate: "" },
  languages: { language: "", proficiency: "" },
};
type EntryType = keyof typeof entryShapes;
const initial: Question[] = [
  ...Object.keys(newCvDocument("x").personalInfo)
    .filter((k) => k !== "photoShape")
    .map((k) => ({
      path: "personalInfo." + k,
      label: labels[k] || k,
      photo: k === "profilePhotoDataUrl",
    })),
  ...Object.keys(newCvDocument("x").registrationInfo).map((k) => ({
    path: "registrationInfo." + k,
    label: "Registration: " + k.replace(/([A-Z])/g, " $1").toLowerCase() + "?",
  })),
  ...[
    "skills",
    "internship",
    "achievements",
    "publications",
    "conferences",
    "memberships",
    "references",
    "hobbies",
    "declaration",
    "declarationDate",
    "declarationPlace",
    "signatureName",
  ].map((k) => ({
    path: k,
    label:
      "Would you like to add " +
      k.replace(/([A-Z])/g, " $1").toLowerCase() +
      "?",
  })),
  {
    path: "signatureDataUrl",
    label: "Add a signature image, if you want one.",
    photo: true,
  },
];
function assign(doc: CvDocument, path: string, value: string): CvDocument {
  const copy = JSON.parse(JSON.stringify(doc)) as CvDocument;
  const keys = path.split(".");
  let target: any = copy;
  for (const key of keys.slice(0, -1)) target = target[key];
  target[keys[keys.length - 1]] = path.endsWith("clinicalSkills")
    ? value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : value;
  return copy;
}
function resumeInterview(): {
  doc: CvDocument;
  questions: Question[];
  index: number;
} {
  try {
    const raw = JSON.parse(
      localStorage.getItem("medcv:interview-position") || "null",
    );
    if (
      raw?.version === 1 &&
      typeof raw.id === "string" &&
      Number.isInteger(raw.index) &&
      Array.isArray(raw.questions) &&
      raw.index >= 0 &&
      raw.index <= raw.questions.length &&
      raw.questions.every(
        (q: any) =>
          typeof q.label === "string" &&
          typeof q.path === "string" &&
          !/prototype|constructor|__proto__/.test(q.path),
      )
    ) {
      const doc = cvStorage.getById(raw.id);
      if (
        doc &&
        raw.questions.every((q: any) => {
          let value: any = doc;
          for (const part of q.path.split(".")) {
            if (
              value == null ||
              !Object.prototype.hasOwnProperty.call(value, part)
            )
              return false;
            value = value[part];
          }
          return true;
        })
      )
        return {
          doc,
          questions: raw.questions as Question[],
          index: raw.index,
        };
    }
  } catch {
    /* Keep the saved CV intact; start a fresh interview. */
  }
  return {
    doc: newCvDocument(createId(), "NURSE"),
    questions: initial,
    index: -1,
  };
}
export default function CvInterview() {
  const navigate = useNavigate();
  const { account } = useAccount();
  const [resumed] = useState(resumeInterview);
  const [doc, setDoc] = useState(resumed.doc);
  const [questions, setQuestions] = useState(resumed.questions);
  const [index, setIndex] = useState(resumed.index);
  useEffect(() => {
    if (index < 0) return;
    try {
      localStorage.setItem(
        "medcv:interview-position",
        JSON.stringify({ version: 1, id: doc.id, index, questions }),
      );
    } catch {
      /* CV save reports storage errors separately. */
    }
  }, [doc.id, index, questions]);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const q = questions[index];
  const themes = [
    ...TEMPLATE_CATALOG,
    ...(account && !account.frozen
      ? account.unlocks
          .map(unlockedPremiumById)
          .filter((t): t is NonNullable<typeof t> => Boolean(t))
      : []),
  ];
  const originalCustom =
    doc.customTemplate?.id === doc.templateId &&
    validCustom(doc.customTemplate);
  const themeAllowed =
    isFreeTemplate(doc.templateId) ||
    originalCustom ||
    themes.some((t) => t.id === doc.templateId);
  function editDraft() {
    if (!themeAllowed) {
      navigate("/template/" + doc.id);
      return;
    }
    navigate("/editor/" + doc.id);
  }

  function save(next: CvDocument) {
    try {
      cvStorage.save(next, true);
      setDoc(next);
      setError("");
      return true;
    } catch {
      setError("Draft could not be saved. Please check storage in Settings.");
      return false;
    }
  }
  function addCustom() {
    const position = doc.customSections.length;
    const nextDoc = {
      ...doc,
      customSections: [
        ...doc.customSections,
        {
          id: createId(),
          title: "",
          entries: [
            {
              id: createId(),
              heading: "",
              description: "",
              date: "",
              location: "",
            },
          ],
        },
      ],
    };
    if (!save(nextDoc)) return;
    const extra = [
      {
        path: `customSections.${position}.title`,
        label: "What is the title of your custom section?",
      },
      ...["heading", "description", "date", "location"].map((k) => ({
        path: `customSections.${position}.entries.0.${k}`,
        label: `Custom section: ${k}?`,
      })),
    ];
    setQuestions((v) => [...v, ...extra]);
    setIndex(questions.length);
    setAnswer("");
  }
  function next(skip = false) {
    const value = skip ? "" : answer.trim();
    if (!save(value ? assign(doc, q.path, value) : doc)) return;
    setHistory((h) => [...h, (value ? "Answered: " : "Skipped: ") + q.label]);
    setIndex((i) => i + 1);
    setAnswer("");
  }
  function addEntry(kind: EntryType) {
    const nextDoc = {
      ...doc,
      [kind]: [...doc[kind], { id: createId(), ...entryShapes[kind] }],
    } as CvDocument;
    if (!save(nextDoc)) return;
    const position = doc[kind].length;
    const extra = Object.keys(entryShapes[kind]).map((k) => ({
      path: `${kind}.${position}.${k}`,
      label: `${kind}: ${k.replace(/([A-Z])/g, " $1")}?`,
    }));
    setQuestions((v) => [...v, ...extra]);
    setIndex(questions.length);
    setAnswer("");
  }
  async function photo(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      setError("Choose an image under 8 MB.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      if (save(assign(doc, q.path, canvas.toDataURL("image/jpeg", 0.85)))) {
        setIndex((i) => i + 1);
        setAnswer("");
      }
    } catch {
      setError("This image could not be opened. Try a JPEG or PNG.");
    }
  }
  return (
    <section id="cv-copilot" className="container copilot">
      <div className="copilot-intro">
        <span className="section__kicker">Meet Mira · Offline CV copilot</span>
        <h2>Just answer. Your CV takes shape.</h2>
        <p>
          A guided conversation using the same CV form fields. Skip anything,
          add photos, and edit your draft at any time. No account or model
          download needed.
        </p>
        <Robot />
      </div>
      <div className="copilot-chat">
        <label htmlFor="mira-theme">CV theme · free or unlocked</label>
        <select
          id="mira-theme"
          value={doc.templateId}
          onChange={(event) => {
            const selected = themes.find((t) => t.id === event.target.value);
            if (!selected) return;
            const nextDoc = {
              ...doc,
              templateId: selected.id,
              customTemplate: undefined,
              colorId: selected.defaultColorId,
            };
            if (index < 0) setDoc(nextDoc);
            else save(nextDoc);
          }}
        >
          {!themeAllowed && (
            <option value={doc.templateId} disabled>
              Locked theme — choose an available design
            </option>
          )}
          {originalCustom && (
            <option value={doc.templateId}>Your original custom design</option>
          )}
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.displayName}
              {isFreeTemplate(t.id) ? " · Free" : " · Unlocked"}
            </option>
          ))}
        </select>
        {!themeAllowed && (
          <small>
            Saved answers are safe. Choose a free design or verify its unlock in
            Templates before exporting.
          </small>
        )}

        <div className="chat-status">
          <span />
          Mira · On your device
        </div>
        {index < 0 ? (
          <>
            <h3>Let’s build your professional CV.</h3>
            <label htmlFor="interview-profession">Your profession</label>
            <select
              id="interview-profession"
              value={doc.profession}
              onChange={(e) =>
                setDoc({ ...doc, profession: e.target.value as Profession })
              }
            >
              {Object.entries(PROFESSION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (save(doc)) setIndex(0);
              }}
            >
              Start guided CV
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                try {
                  const draft = cvStorage.getLatestDraft();
                  if (draft) {
                    setDoc(draft);
                    setIndex(0);
                  } else setError("No draft saved yet. Start a new guided CV.");
                } catch {
                  setError("Open Settings to recover saved data.");
                }
              }}
            >
              Continue saved draft
            </button>
          </>
        ) : q ? (
          <>
            <small>
              Question {index + 1} of {questions.length} · Draft saved after
              each answer
            </small>
            <progress value={index} max={questions.length} />
            <p className="chat-bubble" aria-live="polite">
              {q.label}
            </p>
            {q.photo ? (
              <input
                aria-label={q.label}
                type="file"
                accept="image/*"
                onChange={(e) => void photo(e.target.files?.[0])}
              />
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  next();
                }}
              >
                <label htmlFor="mira-answer">Your answer</label>
                <textarea
                  id="mira-answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={3}
                />
                <button className="btn btn-primary">
                  Save answer & continue
                </button>
              </form>
            )}
            <div className="chat-actions">
              <button className="btn btn-secondary" onClick={() => next(true)}>
                Skip question
              </button>
              <button
                disabled={index === 0}
                className="btn btn-secondary"
                onClick={() => {
                  setIndex((i) => i - 1);
                  setAnswer("");
                }}
              >
                Back
              </button>
              <button className="btn btn-secondary" onClick={editDraft}>
                Edit draft now
              </button>
            </div>
          </>
        ) : (
          <>
            <h3>
              Your draft is ready,{" "}
              {doc.personalInfo.fullName || "future healthcare professional"}.
            </h3>
            <p>Add as many qualifications and roles as you need.</p>
            <div className="chat-actions">
              {(Object.keys(entryShapes) as EntryType[]).map((k) => (
                <button
                  className="btn btn-secondary"
                  key={k}
                  onClick={() => addEntry(k)}
                >
                  Add {k}
                </button>
              ))}
            </div>
            <button className="btn btn-secondary" onClick={addCustom}>
              Add custom section
            </button>
            <button className="btn btn-primary" onClick={editDraft}>
              Review and finish my CV →
            </button>
            <p>Choose a design and add custom sections in the editor.</p>
          </>
        )}
        {error && <p role="alert">{error}</p>}
        {history.length > 0 && (
          <small>
            {history.length} questions completed. All answers remain editable.
          </small>
        )}
      </div>
    </section>
  );
}
