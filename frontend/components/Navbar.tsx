"use client";

import Link from "next/link";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { truncateAddress } from "@/lib/utils";

export default function Navbar() {
  const { authenticated, login, logout, ready } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address;

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
          }}
        >
          PayLink
        </span>
      </div>

      <div className="flex items-center gap-3">
        {authenticated && walletAddress ? (
          <>
            <Link
              href="/history"
              style={{
                color: "var(--text-muted)",
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.875rem",
              }}
              className="transition hover:text-[var(--text)]"
            >
              History
            </Link>
            <button
              type="button"
              onClick={logout}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "999px",
                color: "var(--highlight)",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.75rem",
                minHeight: "44px",
                transition: "var(--transition)",
              }}
              className="px-4 hover:shadow-[var(--glow-purple)]"
              aria-label="Log out"
            >
              {truncateAddress(walletAddress)}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={login}
            disabled={!ready}
            style={{
              background: "var(--primary)",
              borderRadius: "var(--radius)",
              color: "var(--text)",
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              minHeight: "44px",
              transition: "var(--transition)",
            }}
            className="px-5 disabled:cursor-not-allowed disabled:opacity-60 hover:shadow-[var(--glow-purple)]"
          >
            Connect
          </button>
        )}
      </div>
    </nav>
  );
}
