const paths: Record<string, string> = {
  document: "M7 3h7l4 4v14H7V3Zm7 0v5h4M10 12h5M10 16h5",
  grid: "M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z",
  calendar: "M4 5h16v16H4V5Zm0 5h16M8 3v4M16 3v4M8 14h3M8 17h6",
  saved: "M5 3h14v18l-7-4-7 4V3Z",
  edit: "m4 16 12-12 4 4L8 20H4v-4Zm9-9 4 4",
  upload: "M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5",
  mail: "M3 5h18v14H3V5Zm0 1 9 7 9-7",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
  settings: "M4 7h16M8 3v8M4 17h16M16 13v8",
  search: "M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6",
  close: "m6 6 12 12M6 18 18 6",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1",
  moon: "M20 14A9 9 0 0 1 10 4a9 9 0 1 0 10 10Z",
  clinical: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z",
  book: "M3 4h6l3 2 3-2h6v16h-6l-3 2-3-2H3V4Zm9 2v16",
  globe:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z",
  graduate: "m2 8 10-5 10 5-10 5-10-5Zm4 2v6c4 4 8 4 12 0v-6M22 8v9",
  briefcase: "M3 7h18v14H3V7Zm5 0V3h8v4M3 12l9 3 9-3M12 12v5",
  robot: "M5 7h14v13H5V7Zm7-4v4M8 12h1m6 0h1M9 16h6M2 10v6m20-6v6",
};
export default function AppIcon({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.document} />
    </svg>
  );
}
