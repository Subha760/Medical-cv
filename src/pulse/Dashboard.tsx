import { useEffect, useMemo, useState } from "react";
import { downloadFile } from "../utils/download";
import { csv, dailyAccounts, type Report } from "./report";

type Props = {
  report: Report;
  userId: string;
  busy: boolean;
  updatedAt: number;
  expiry: string;
  refresh: () => Promise<void>;
  action: (type: string, payload: Record<string, unknown>) => Promise<void>;
  run: (fn: () => Promise<void>) => Promise<void>;
  reason: string;
  setReason: (value: string) => void;
};
const sections = [
  ["overview", "Overview", "◈"],
  ["accounts", "Accounts", "◎"],
  ["support", "Support inbox", "✉"],
  ["controls", "Controls & credits", "⚙"],
  ["activity", "Activity & reports", "↗"],
];
const dateText = (value?: string) =>
  value ? new Date(value).toLocaleString() : "Not recorded";

export default function Dashboard({
  report,
  userId,
  busy,
  updatedAt,
  expiry,
  refresh,
  action,
  run,
  reason,
  setReason,
}: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketFilter, setTicketFilter] = useState("open");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState(1);
  const [editId, setEditId] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [active, setActive] = useState("overview");
  const [now, setNow] = useState(Date.now());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [exportMessage, setExportMessage] = useState("");
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible" && !busy) void run(refresh);
    }, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, busy, refresh, run]);
  useEffect(() => setPage(0), [search, filter, sort]);
  const profiles = useMemo(
    () =>
      report.profiles
        .filter((p) => {
          const matches = (p.code + " " + p.user_id)
            .toLowerCase()
            .includes(search.toLowerCase());
          return (
            matches &&
            (filter === "all" ||
              (filter === "paused"
                ? p.frozen
                : filter === "credits"
                  ? p.credits > 0
                  : !p.frozen))
          );
        })
        .sort((a, b) =>
          sort === "credits"
            ? b.credits - a.credits
            : sort === "code"
              ? a.code.localeCompare(b.code)
              : (b.created_at || "").localeCompare(a.created_at || ""),
        ),
    [report.profiles, search, filter, sort],
  );
  const pageCount = Math.max(1, Math.ceil(profiles.length / 10));
  const currentPage = Math.min(page, pageCount - 1);
  const tickets = report.tickets.filter(
    (t) =>
      (ticketFilter === "all" || t.status === ticketFilter) &&
      (t.subject + " " + t.message + " " + t.id)
        .toLowerCase()
        .includes(ticketSearch.toLowerCase()),
  );
  const audit = report.audit.filter((a) =>
    (a.action + " " + a.actor + " " + JSON.stringify(a.details))
      .toLowerCase()
      .includes(auditSearch.toLowerCase()),
  );
  const days = dailyAccounts(report.profiles);
  const maxDay = Math.max(1, ...days.map((d) => d.count));
  const conversion = report.users
    ? Math.round((report.qualified / report.users) * 100)
    : 0;
  const openTickets = report.tickets.filter((t) => t.status === "open").length;
  const canChange = !busy && reason.trim().length >= 5;
  const remaining = expiry
    ? Math.max(0, Math.ceil((new Date(expiry).getTime() - now) / 1000))
    : null;
  async function exportCsv(
    kind: "accounts" | "support" | "activity" | "summary",
  ) {
    const rows =
      kind === "accounts"
        ? [
            ["Account ID", "Referral code", "Credits", "Status", "Joined"],
            ...profiles.map((p) => [
              p.user_id,
              p.code,
              p.credits,
              p.frozen ? "Paused" : "Active",
              p.created_at,
            ]),
          ]
        : kind === "support"
          ? [
              [
                "Ticket ID",
                "Account ID",
                "Subject",
                "Message",
                "Status",
                "Reply",
                "Created",
              ],
              ...tickets.map((t) => [
                t.id,
                t.user_id,
                t.subject,
                t.message,
                t.status,
                t.reply,
                t.created_at,
              ]),
            ]
          : kind === "activity"
            ? [
                ["Time", "Actor", "Action", "Details"],
                ...audit.map((a) => [
                  a.created_at,
                  a.actor,
                  a.action,
                  JSON.stringify(a.details),
                ]),
              ]
            : [
                ["Metric", "Value"],
                ["Accounts", report.users],
                ["Completed CVs", report.qualified],
                ["Referral credits awarded", report.awarded],
                ["Credits spent", report.spent],
                ["Finalized edits", report.edits],
                ["Template unlocks", report.unlocks],
              ];
    await downloadFile(
      new Blob([csv(rows)], { type: "text/csv;charset=utf-8" }),
      `pulse-${kind}-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    setExportMessage(
      "Report exported. Keep account and support reports private.",
    );
  }
  return (
    <div className="pulse-dashboard">
      <aside className="pulse-rail" aria-label="Owner workspace">
        <p className="eyebrow">Your command centre</p>
        <nav aria-label="Pulse sections">
          {sections.map(([id, label, icon]) => (
            <a
              key={id}
              href={`#${id}`}
              className={active === id ? "is-active" : ""}
              onClick={() => setActive(id)}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
              {id === "support" && openTickets > 0 && (
                <small>{openTickets}</small>
              )}
            </a>
          ))}
        </nav>
        <div className="pulse-rail-note">
          <span className="pulse-dot" /> Verified owner access
          <p>Actions are checked by the server and saved in the audit trail.</p>
          <a href="../" target="_blank" rel="noreferrer">
            Open Medico ↗
          </a>
        </div>
      </aside>
      <div className="pulse-content">
        <section id="overview" className="pulse-overview">
          <div className="pulse-hero">
            <div>
              <p className="eyebrow">Medico operations</p>
              <h2>Good decisions start here.</h2>
              <p>
                Follow your community, manage rewards and support the people
                building their next chapter.
              </p>
              <div className="pulse-hero-badges">
                <span>Gmail verified</span>
                <span>
                  {report.config.referrals_enabled
                    ? "Referral rewards active"
                    : "Referral rewards paused"}
                </span>
                <span>
                  {remaining === null
                    ? "Authenticator session"
                    : `Session ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}
                </span>
              </div>
            </div>
            <div className="pulse-orbit" aria-hidden="true">
              <span>✦</span>
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="pulse-toolbar">
            <span>Updated {new Date(updatedAt).toLocaleTimeString()}</span>
            <label className="pulse-inline">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Refresh every 30 seconds
            </label>
            <button
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => void run(refresh)}
            >
              Refresh report
            </button>
            <button
              className="btn btn-primary"
              onClick={() => void run(() => exportCsv("summary"))}
            >
              Export summary CSV
            </button>
          </div>
          {exportMessage && (
            <p role="status" className="pulse-feedback">
              {exportMessage}
            </p>
          )}
          <div className="metric-grid pulse-metrics">
            {[
              ["Accounts", report.users, "Verified profiles"],
              ["Completed CVs", report.qualified, `${conversion}% of accounts`],
              ["Credits earned", report.awarded, "Verified referral rewards"],
              ["Credits spent", report.spent, "Templates and edits"],
              ["Edited documents", report.edits, "Finalized versions"],
              ["Template unlocks", report.unlocks, "Permanent access"],
            ].map(([label, value, detail], i) => (
              <article
                className="card"
                key={label}
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <span className="pulse-metric-label">{label}</span>
                <strong>{value}</strong>
                <small>{detail}</small>
              </article>
            ))}
          </div>
          <div className="pulse-two-col">
            <section className="card studio-panel">
              <div className="pulse-section-heading">
                <div>
                  <p className="eyebrow">Community activity</p>
                  <h3>New accounts · 7 days</h3>
                </div>
                <span className="pulse-tag">Recent 200 profiles</span>
              </div>
              <div
                className="pulse-chart"
                role="img"
                aria-label={days
                  .map(
                    (d) =>
                      `${d.date.toLocaleDateString()}: ${d.count} new accounts`,
                  )
                  .join("; ")}
              >
                {days.map((d) => (
                  <div key={d.date.toISOString()}>
                    <strong>{d.count}</strong>
                    <div className="pulse-bar-track">
                      <span
                        style={{ height: `${(d.count / maxDay) * 100}%` }}
                      />
                    </div>
                    <small>
                      {d.date.toLocaleDateString(undefined, {
                        weekday: "short",
                      })}
                    </small>
                  </div>
                ))}
              </div>
              <p className="pulse-caption">
                Based on creation dates in the newest 200 accounts. Older
                accounts are outside this chart.
              </p>
            </section>
            <section className="card studio-panel">
              <p className="eyebrow">What needs your attention</p>
              <h3>Today’s queue</h3>
              <a className="pulse-queue" href="#support">
                <span>
                  Open support requests<small>In the newest 200 tickets</small>
                </span>
                <strong>{openTickets} →</strong>
              </a>
              <a className="pulse-queue" href="#accounts">
                <span>
                  Paused profiles<small>In the newest 200 accounts</small>
                </span>
                <strong>
                  {report.profiles.filter((p) => p.frozen).length} →
                </strong>
              </a>
              <a className="pulse-queue" href="#controls">
                <span>
                  Feature availability
                  <small>Referrals / document editing</small>
                </span>
                <strong>
                  {Number(report.config.referrals_enabled) +
                    Number(report.config.imports_enabled)}{" "}
                  / 2
                </strong>
              </a>
              <p className="pulse-caption">
                No original CVs or uploaded documents are stored in these
                reports.
              </p>
            </section>
          </div>
        </section>
        <section id="accounts" className="card studio-panel">
          <div className="pulse-section-heading">
            <div>
              <p className="eyebrow">Community management</p>
              <h2>Accounts · newest 200</h2>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => void run(() => exportCsv("accounts"))}
            >
              Export filtered accounts
            </button>
          </div>
          <div className="pulse-filters">
            <label>
              Search accounts
              <input
                type="search"
                placeholder="Referral code or account ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label>
              Account status
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All accounts</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="credits">Has credits</option>
              </select>
            </label>
            <label>
              Sort accounts
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">Newest first</option>
                <option value="credits">Highest credits</option>
                <option value="code">Referral code</option>
              </select>
            </label>
          </div>
          <div className="pulse-grant-setting">
            <label>
              Support credit amount
              <input
                type="number"
                min={1}
                max={20}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </label>
            <p>
              Choose 1–20 credits. Add an audit reason in Controls before
              granting credits or pausing accounts.
            </p>
          </div>
          <div className="table-scroll pulse-account-table">
            <table>
              <thead>
                <tr>
                  <th>Referral code / account</th>
                  <th>Joined</th>
                  <th>Credits</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles
                  .slice(currentPage * 10, currentPage * 10 + 10)
                  .map((p) => (
                    <tr key={p.user_id}>
                      <td data-label="Account">
                        <strong>{p.code}</strong>
                        <small>{p.user_id}</small>
                      </td>
                      <td data-label="Joined">
                        {p.created_at
                          ? new Date(p.created_at).toLocaleDateString()
                          : "—"}
                      </td>
                      <td data-label="Credits">
                        <span className="pulse-credit-value">{p.credits}</span>
                      </td>
                      <td data-label="Status">
                        <span
                          className={`pulse-tag ${p.frozen ? "is-paused" : "is-enabled"}`}
                        >
                          {p.frozen ? "Paused" : "Active"}
                        </span>
                      </td>
                      <td data-label="Actions">
                        <div className="pulse-row-actions">
                          <button
                            className="btn btn-secondary"
                            disabled={!canChange || p.user_id === userId}
                            onClick={() =>
                              void action("admin_freeze", {
                                userId: p.user_id,
                                frozen: !p.frozen,
                              })
                            }
                          >
                            {p.frozen ? "Resume" : "Pause"}
                          </button>
                          <button
                            className="btn btn-secondary"
                            disabled={
                              !canChange ||
                              !Number.isInteger(amount) ||
                              amount < 1 ||
                              amount > 20
                            }
                            onClick={() =>
                              void action("admin_credit", {
                                userId: p.user_id,
                                amount,
                              })
                            }
                          >
                            Grant {amount || "…"}{" "}
                            {amount === 1 ? "credit" : "credits"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!profiles.length && (
            <div className="pulse-empty">No accounts match these filters.</div>
          )}
          <div className="pulse-pagination">
            <span>
              {profiles.length} matching · page {currentPage + 1} of {pageCount}
            </span>
            <button
              className="btn btn-secondary"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </button>
            <button
              className="btn btn-secondary"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </section>
        <section id="support" className="card studio-panel">
          <div className="pulse-section-heading">
            <div>
              <p className="eyebrow">Help your community</p>
              <h2>Support inbox</h2>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => void run(() => exportCsv("support"))}
            >
              Export filtered tickets
            </button>
          </div>
          <div className="pulse-filters">
            <label>
              Search support
              <input
                type="search"
                placeholder="Subject, message or ticket ID"
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
              />
            </label>
            <label>
              Ticket status
              <select
                value={ticketFilter}
                onChange={(e) => setTicketFilter(e.target.value)}
              >
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="all">All tickets</option>
              </select>
            </label>
          </div>
          {tickets.map((t) => (
            <article className="pulse-ticket" key={t.id}>
              <div className="pulse-section-heading">
                <h3>{t.subject}</h3>
                <span className="pulse-tag">{t.status}</span>
              </div>
              <p className="pulse-ticket-message">{t.message}</p>
              <small>
                {dateText(t.created_at)} · {t.id}
              </small>
              {t.reply && <blockquote>{t.reply}</blockquote>}
              {t.status !== "resolved" && (
                <>
                  <label>
                    Response to {t.subject}
                    <textarea
                      rows={3}
                      maxLength={2000}
                      placeholder="Write a helpful response…"
                      value={replies[t.id] || ""}
                      onChange={(e) =>
                        setReplies({ ...replies, [t.id]: e.target.value })
                      }
                    />
                  </label>
                  <button
                    className="btn btn-primary"
                    disabled={
                      !canChange || (replies[t.id] || "").trim().length < 5
                    }
                    onClick={() =>
                      void action("admin_ticket", {
                        id: t.id,
                        reply: replies[t.id].trim(),
                      })
                    }
                  >
                    Reply and resolve
                  </button>
                </>
              )}
            </article>
          ))}
          {!tickets.length && (
            <div className="pulse-empty">
              <span aria-hidden="true">✉</span>
              <h3>
                {ticketFilter === "open"
                  ? "Your inbox is clear."
                  : "No matching requests."}
              </h3>
              <p>New requests from the Medico account page appear here.</p>
            </div>
          )}
        </section>
        <section id="controls" className="card studio-panel">
          <p className="eyebrow">Audited administration</p>
          <h2>Controls & credits</h2>
          <label>
            Reason for administrative changes (required)
            <input
              minLength={5}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain the support issue or policy change"
            />
          </label>
          <p className="pulse-caption">
            Use at least 5 non-space characters. This reason is saved with every
            administrative action.
          </p>
          <div className="pulse-two-col">
            <article className="pulse-feature">
              <span
                className={`pulse-tag ${report.config.referrals_enabled ? "is-enabled" : "is-paused"}`}
              >
                {report.config.referrals_enabled ? "Active" : "Paused"}
              </span>
              <h3>Automatic referral rewards</h3>
              <p>
                One new, verified colleague completes a qualifying CV: the
                server awards one credit to the referrer. Repeated submissions
                cannot earn a second reward.
              </p>
              <button
                className="btn btn-secondary"
                disabled={!canChange}
                onClick={() =>
                  void action("admin_flags", {
                    referrals: !report.config.referrals_enabled,
                    imports: report.config.imports_enabled,
                  })
                }
              >
                {report.config.referrals_enabled ? "Pause" : "Enable"} referral
                rewards
              </button>
            </article>
            <article className="pulse-feature">
              <span
                className={`pulse-tag ${report.config.imports_enabled ? "is-enabled" : "is-paused"}`}
              >
                {report.config.imports_enabled ? "Active" : "Paused"}
              </span>
              <h3>Document editing</h3>
              <p>
                One credit reserves a 24-hour edit session for one PDF or Word
                file. One final version is allowed; repeat downloads use that
                same version.
              </p>
              <button
                className="btn btn-secondary"
                disabled={!canChange}
                onClick={() =>
                  void action("admin_flags", {
                    referrals: report.config.referrals_enabled,
                    imports: !report.config.imports_enabled,
                  })
                }
              >
                {report.config.imports_enabled ? "Pause" : "Enable"} document
                editing
              </button>
            </article>
          </div>
          <div className="pulse-refund">
            <h3>Unused edit refund</h3>
            <p>
              Refund a reserved, unfinalized edit by session ID. The server
              rejects completed edits and duplicate refunds.
            </p>
            <label>
              Edit session ID
              <input
                value={editId}
                onChange={(e) => setEditId(e.target.value.trim())}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </label>
            <button
              className="btn btn-secondary"
              disabled={
                !canChange ||
                !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
                  editId,
                )
              }
              onClick={() => void action("admin_refund_edit", { id: editId })}
            >
              Refund unused reservation
            </button>
          </div>
        </section>
        <section id="activity" className="card studio-panel">
          <div className="pulse-section-heading">
            <div>
              <p className="eyebrow">Trace every change</p>
              <h2>Audit trail · newest 200</h2>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => void run(() => exportCsv("activity"))}
            >
              Export filtered activity
            </button>
          </div>
          <label>
            Search audit trail
            <input
              type="search"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Action, account or reason"
            />
          </label>
          {audit.map((a, i) => (
            <div className="pulse-audit-row" key={`${a.created_at}-${i}`}>
              <span className="pulse-audit-dot" />
              <div>
                <strong>
                  {a.action.replace(/^admin_/, "").replace(/_/g, " ")}
                </strong>
                <time>{dateText(a.created_at)}</time>
                <details>
                  <summary>Actor and details</summary>
                  <p>{a.actor}</p>
                  <pre>{JSON.stringify(a.details, null, 2)}</pre>
                </details>
              </div>
            </div>
          ))}
          {!audit.length && (
            <div className="pulse-empty">No activity matches this search.</div>
          )}
          <div className="action-row">
            <button
              className="btn btn-secondary"
              onClick={() =>
                void run(async () => {
                  await downloadFile(
                    new Blob([JSON.stringify(report, null, 2)], {
                      type: "application/json",
                    }),
                    "pulse-report.json",
                  );
                  setExportMessage("Full report exported. Keep it private.");
                })
              }
            >
              Export full JSON report
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => window.print()}
            >
              Print report
            </button>
          </div>
          <p className="pulse-caption">
            Exports include private account metadata. Original CVs and document
            uploads are not included.
          </p>
        </section>
        <section className="card studio-panel">
          <p className="eyebrow">Release checklist</p>
          <h2>Release & advertising readiness</h2>
          <div className="pulse-readiness">
            <span className="pulse-tag is-enabled">HTTPS domain live</span>
            <span className="pulse-tag is-enabled">Owner-only access</span>
            <span className="pulse-tag is-paused">Advertising disabled</span>
            <span className="pulse-tag is-paused">Store review pending</span>
          </div>
          <p>
            Web AdSense requires publisher and slot IDs, approval and consent
            configuration. Mobile advertising requires AdMob. Referral and admin
            screens carry no ads. Signed app builds are prepared; Play and Indus
            publication still requires developer submission and review.
          </p>
          <a href="../privacy.html" target="_blank" rel="noreferrer">
            Privacy policy ↗
          </a>{" "}
          ·{" "}
          <a href="../account-deletion.html" target="_blank" rel="noreferrer">
            Deletion instructions ↗
          </a>
        </section>
      </div>
    </div>
  );
}
