import { useState } from "react";
import {
  AssistantId,
  OFFLINE_ASSISTANTS,
  runOfflineAssistant,
} from "../ai/offlineAssistants";
import { downloadFile } from "../utils/download";
export default function AssistantStudio() {
  const [id, setId] = useState<AssistantId>("rewrite");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const selected = OFFLINE_ASSISTANTS.find((a) => a.id === id)!;
  return (
    <section className="tool-card">
      <h2>15 offline assistants</h2>
      <p>
        Local rules and templates run on your device. These are specialist
        writing and planning tools, not downloaded neural models or clinical
        decision systems. Review every result.
      </p>
      <div className="assistant-grid">
        {OFFLINE_ASSISTANTS.map((a) => (
          <button
            key={a.id}
            className={id === a.id ? "active" : ""}
            aria-pressed={id === a.id}
            onClick={() => {
              setId(a.id);
              setOutput("");
            }}
          >
            <strong>{a.name}</strong>
            <small style={{ display: "block" }}>{a.hint}</small>
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setOutput(runOfflineAssistant(id, input));
        }}
        className="tool-form"
      >
        <label htmlFor="assistant-notes">
          {selected.name} · Your notes (no patient identifiers)
        </label>
        <textarea
          id="assistant-notes"
          required
          rows={6}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Use your own experience, study notes or fictional examples."
        />
        <button className="btn btn-primary">Run offline assistant</button>
      </form>
      {output && (
        <>
          <div className="assistant-output" aria-live="polite">
            {output}
          </div>
          <button
            className="btn btn-secondary"
            onClick={() =>
              downloadFile(
                new Blob([output], { type: "text/plain" }),
                "MedCV-assistant-notes.txt",
              )
            }
          >
            Download result
          </button>
        </>
      )}
    </section>
  );
}
