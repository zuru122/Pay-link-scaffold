export default function Navbar() {
  return (
    <nav
      style={{
        borderBottom: "1px solid var(--border)",
        background: "transparent",
      }}
      className="w-full px-6 py-4 flex items-center justify-between"
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        {/* Purple hex icon */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
            fill="var(--primary)"
            fillOpacity="0.2"
            stroke="var(--primary)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M12 6L17 9V15L12 18L7 15V9L12 6Z"
            fill="var(--primary)"
          />
        </svg>

        <span
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: "1.25rem",
            color: "var(--text)",
            letterSpacing: "-0.01em",
          }}
        >
          PayLink
        </span>
      </div>

      {/* Wallet slot — populated later */}
      <div />
    </nav>
  );
}
