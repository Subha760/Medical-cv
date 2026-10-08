import { useState } from "react";
import { Shift, shiftHours, today } from "../workspace/model";
import {
  ROTA_CODES,
  parseRota,
  shiftsForCode,
  rotaWarnings,
} from "../workspace/rota";
export default function RotaPlanner({
  shifts,
  onSave,
}: {
  shifts: Shift[];
  onSave: (shifts: Shift[]) => boolean;
}) {
  const [previous, setPrevious] = useState<Shift[] | null>(null);
  function commit(next: Shift[]) {
    if (onSave(next)) {
      setPrevious(shifts);
      return true;
    }
    return false;
  }
  const [month, setMonth] = useState(today().slice(0, 7));
  const [code, setCode] = useState("M");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ReturnType<typeof parseRota> | null>(
    null,
  );
  const [rate, setRate] = useState("");
  const monthly = shifts.filter((s) => s.date.startsWith(month));
  const hours = monthly.reduce((n, s) => n + shiftHours(s), 0);
  const count = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5)),
    0,
  ).getDate();
  const offset = (new Date(month + "-01T12:00:00").getDay() + 6) % 7;
  return (
    <section>
      <h3>Monthly rota studio</h3>
      <p>
        Rota-pro inspired shift codes, with real segment hours. Select a code
        and tap a day to replace that day’s entries. You can undo your last rota
        edit. Imports add to your existing shifts; duplicates are skipped. OFF
        and leave days contribute no working hours.
      </p>
      {previous && (
        <button
          className="btn btn-secondary"
          onClick={() => {
            if (onSave(previous)) setPrevious(null);
          }}
        >
          Undo last rota edit
        </button>
      )}
      <label htmlFor="rota-month">Rota month</label>
      <input
        id="rota-month"
        type="month"
        value={month}
        onChange={(e) => {
          if (e.target.value) setMonth(e.target.value);
          setPreview(null);
        }}
      />
      <div className="rota-codes">
        {Object.entries(ROTA_CODES).map(([key, value]) => (
          <button
            key={key}
            aria-pressed={code === key}
            onClick={() => setCode(key)}
            style={
              code === key
                ? { borderColor: "var(--color-teal)", fontWeight: 700 }
                : {}
            }
            title={value.label}
          >
            {key}
          </button>
        ))}
      </div>
      <p>
        <strong>{hours.toFixed(1)} scheduled hours</strong> ·{" "}
        {monthly.filter((s) => s.kind === "leave").length} leave days ·{" "}
        {monthly.filter((s) => s.kind === "off").length} days off
      </p>
      <label htmlFor="rota-rate">
        Optional hourly rate (estimate only, before breaks / tax)
      </label>
      <input
        id="rota-rate"
        type="number"
        min="0"
        step="0.01"
        value={rate}
        onChange={(e) => setRate(e.target.value)}
      />
      {rate && (
        <p>
          Estimated gross: {(hours * Number(rate)).toFixed(2)} in your chosen
          currency.
        </p>
      )}
      <div className="rota-calendar">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <strong key={d}>{d}</strong>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={"blank" + i} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const date = month + "-" + String(i + 1).padStart(2, "0");
          const entries = monthly.filter((s) => s.date === date);
          return (
            <button
              className="rota-day"
              key={date}
              aria-label={`Set ${date} to ${code}`}
              onClick={() =>
                commit([
                  ...shifts.filter((s) => s.date !== date),
                  ...shiftsForCode(date, code),
                ])
              }
            >
              <strong>{i + 1}</strong>
              {entries.map((s) => (
                <span key={s.id}>{s.label.split(" · ")[0]}</span>
              ))}
            </button>
          );
        })}
      </div>
      {rotaWarnings(monthly).map((w) => (
        <p key={w} role="status">
          ⚑ {w}
        </p>
      ))}
      <label htmlFor="rota-import">
        Paste your own row of codes (e.g. 1 M, 2 E, 3 N, 4 OFF)
      </label>
      <textarea
        id="rota-import"
        rows={3}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setPreview(null);
        }}
      />
      <p>
        Use one staff row only. Sequential codes start at day 1; numbered codes
        choose specific dates. Unknown codes must be corrected.
      </p>
      <button
        className="btn btn-secondary"
        onClick={() => setPreview(parseRota(text, month))}
      >
        Review roster import
      </button>
      {preview && (
        <div className="assistant-output">
          {preview.errors.map((e) => (
            <p key={e} role="alert">
              {e}
            </p>
          ))}
          {preview.shifts.map((s) => (
            <div key={s.id}>
              {s.date} · {s.label} · {shiftHours(s)} h
            </div>
          ))}
          <button
            className="btn btn-primary"
            disabled={preview.errors.length > 0 || !preview.shifts.length}
            onClick={() => {
              const added = preview.shifts.filter(
                (s) =>
                  !shifts.some(
                    (old) =>
                      old.date === s.date &&
                      old.start === s.start &&
                      old.end === s.end &&
                      old.label === s.label,
                  ),
              );
              if (commit([...shifts, ...added])) {
                setPreview(null);
                setText("");
              }
            }}
          >
            Confirm import
          </button>
        </div>
      )}
    </section>
  );
}
