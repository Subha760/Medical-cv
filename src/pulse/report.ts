export type Report = {
  users: number;
  qualified: number;
  awarded: number;
  spent: number;
  edits: number;
  unlocks: number;
  profiles: {
    user_id: string;
    code: string;
    credits: number;
    frozen: boolean;
    created_at?: string;
  }[];
  tickets: {
    id: string;
    user_id?: string;
    subject: string;
    message: string;
    status: string;
    reply: string;
    created_at?: string;
  }[];
  audit: {
    actor: string;
    action: string;
    created_at: string;
    details: unknown;
  }[];
  config: { referrals_enabled: boolean; imports_enabled: boolean };
};

// Quote every cell and neutralize spreadsheet formulas in user-entered fields.
export function csv(rows: unknown[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let text = String(value ?? "");
            if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
            return '"' + text.replace(/"/g, '""') + '"';
          })
          .join(","),
      )
      .join("\r\n")
  );
}

export function dailyAccounts(profiles: Report["profiles"], now = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6 + i,
    );
    const end = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() + 1,
    );
    return {
      date,
      count: profiles.filter(
        (p) =>
          p.created_at &&
          new Date(p.created_at) >= date &&
          new Date(p.created_at) < end,
      ).length,
    };
  });
}
