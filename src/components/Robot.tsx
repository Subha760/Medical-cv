import { useId } from "react";

export default function Robot() {
  const shellId = useId();
  return (
    <svg
      className="mira-robot"
      viewBox="0 0 260 260"
      role="img"
      aria-label="Mira, your animated CV guide"
    >
      <defs>
        <linearGradient id={shellId} x2="1" y2="1">
          <stop stopColor="#fff" />
          <stop offset="1" stopColor="#b5e9e5" />
        </linearGradient>
      </defs>
      <ellipse
        className="robot-shadow"
        cx="130"
        cy="237"
        rx="66"
        ry="10"
        fill="#127f7930"
      />
      <g className="robot-float">
        <path d="M130 39V22" stroke="#338c87" strokeWidth="7" />
        <circle className="robot-light" cx="130" cy="18" r="9" fill="#56d9c0" />
        <rect
          x="47"
          y="49"
          width="166"
          height="116"
          rx="45"
          fill={`url(#${shellId})`}
          stroke="#419f99"
          strokeWidth="3"
        />
        <rect x="66" y="69" width="128" height="72" rx="29" fill="#173d49" />
        <g className="robot-eyes" fill="#66efd2">
          <rect x="88" y="87" width="15" height="24" rx="7" />
          <rect x="157" y="87" width="15" height="24" rx="7" />
        </g>
        <path
          d="M113 122Q130 132 147 122"
          fill="none"
          stroke="#66efd2"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <rect
          x="87"
          y="169"
          width="86"
          height="57"
          rx="23"
          fill={`url(#${shellId})`}
          stroke="#419f99"
          strokeWidth="3"
        />
        <path
          d="M130 181v27m-13-13h26"
          stroke="#248d89"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M78 181L56 207"
          stroke="#8bcfc5"
          strokeWidth="15"
          strokeLinecap="round"
        />
        <g className="robot-wave">
          <path
            d="M182 180L208 155L221 131"
            stroke="#8bcfc5"
            strokeWidth="15"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  );
}
