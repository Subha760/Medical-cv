import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { cvStorage } from "../storage/cvStorage";
import { CvDocument } from "../types/cv";

export default function SavedCvsPage() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<CvDocument[]>([]);

  useEffect(() => {
    setDocs(cvStorage.listSaved());
  }, []);

  function remove(id: string) {
    cvStorage.remove(id);
    setDocs(cvStorage.listSaved());
  }

  return (
    <>
      <NavBar />
      <main className="container" style={{ padding: "48px 24px" }}>
        <h1 style={{ font: "var(--text-display)", fontSize: "1.8rem", marginBottom: 24 }}>My Saved CVs</h1>

        {docs.length === 0 ? (
          <p style={{ color: "var(--color-muted)" }}>
            No saved CVs yet.{" "}
            <button className="btn btn-primary" style={{ marginLeft: 8 }} onClick={() => navigate("/new")}>
              Create one
            </button>
          </p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {docs.map((doc) => (
              <div key={doc.id} className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{doc.label || doc.personalInfo.fullName || "Untitled CV"}</div>
                  <div className="mono-label">Updated {new Date(doc.updatedAt).toLocaleDateString()}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-secondary" onClick={() => navigate(`/preview/${doc.id}`)}>
                    Preview
                  </button>
                  <button className="btn btn-secondary" onClick={() => navigate(`/editor/${doc.id}`)}>
                    Edit
                  </button>
                  <button className="btn btn-ghost" onClick={() => remove(doc.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
