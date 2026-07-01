export default function Logo({ className = 'h-7 w-7' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MyACS Logo"
    >
      <rect width="48" height="48" rx="10" fill="url(#logo-gradient)" />
      <rect x="0.5" y="0.5" width="47" height="47" rx="9.5" stroke="white" strokeOpacity="0.12" />
      <path
        d="M14 30V18l10 6 10-6v12l-10 6-10-6z"
        stroke="white"
        strokeWidth="2.25"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="24" cy="24" r="2.5" fill="white" />
      <path
        d="M24 15v3M24 30v3M33 24h-3M18 24h-3"
        stroke="white"
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity="0.6"
      />
      <defs>
        <linearGradient id="logo-gradient" x1="4" y1="4" x2="44" y2="44">
          <stop stopColor="#3366ff" />
          <stop offset="1" stopColor="#111c5a" />
        </linearGradient>
      </defs>
    </svg>
  );
}
