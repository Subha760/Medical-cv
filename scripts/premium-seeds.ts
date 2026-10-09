import { writeFileSync, mkdirSync } from "node:fs";
import { TEMPLATE_CATALOG } from "../src/data/templateCatalog";
import { PREMIUM_CATALOG } from "../src/data/premiumCatalog";
const variants = [
  {
    layout: "ledger",
    header: "masthead",
    headingStyle: "double",
    fontStyle: "serif",
    density: "airy",
    supportsPhoto: false,
  },
  {
    layout: "sidebar",
    header: "boxed",
    headingStyle: "outline",
    fontStyle: "serif",
    density: "airy",
    supportsPhoto: true,
  },
  {
    layout: "timeline",
    header: "monogram",
    headingStyle: "numbered",
    fontStyle: "sans",
    density: "balanced",
    supportsPhoto: false,
  },
  {
    layout: "split",
    header: "banner",
    headingStyle: "caps",
    fontStyle: "mono",
    density: "dense",
    supportsPhoto: false,
  },
];
const configs = PREMIUM_CATALOG.map((d) => ({
  ...TEMPLATE_CATALOG.find((t) => t.category === d.category)!,
  ...variants[Number(d.id.slice(-1)) - 1],
  id: d.id,
  displayName: d.name,
  description: d.description,
  isAtsFriendly: false,
}));
mkdirSync("release", { recursive: true });
writeFileSync("release/premium-configs.json", JSON.stringify(configs, null, 2));
const quote = (s: string) => "'" + s.replace(/'/g, "''") + "'";
writeFileSync(
  "supabase/premium-seeds.sql",
  configs
    .map(
      (t) =>
        `insert into medcv_private.templates(id,name,category,description,config) values (${quote(t.id)},${quote(t.displayName)},${quote(t.category)},${quote(t.description)},${quote(JSON.stringify(t))}::jsonb) on conflict(id) do update set name=excluded.name,description=excluded.description,config=excluded.config;`,
    )
    .join("\n"),
);
console.log("Prepared 32 original premium layout configurations.");
