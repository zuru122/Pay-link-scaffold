"use client";

import { useState } from "react";
import {
  useCreateWalletSafe,
  usePrivySafe,
  useWalletsSafe,
} from "@/hooks/usePrivySafe";
import { ethers } from "ethers";
import Link from "next/link";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/contract";
import { toast } from "@/hooks/useToast";
import { generateLinkId } from "@/lib/utils";
import { ensureMonadTestnet } from "@/lib/walletNetwork";

type PageState = "form" | "loading" | "success";

export default function HomePage() {
  const { ready, authenticated, login } = usePrivySafe();
  const { wallets } = useWalletsSafe();
  const { createWallet } = useCreateWalletSafe();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [state, setState] = useState<PageState>("form");
  const [error, setError] = useState("");
  const [createdUrl, setCreatedUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const isDisabled =
    !ready || !amount.trim() || !description.trim() || state === "loading";

  async function handleSubmit() {
    setError("");

    if (!ethers.isAddress(CONTRACT_ADDRESS)) {
      setError("App is not configured with a valid contract address.");
      toast("Missing contract address", "error");
      return;
    }

    if (!authenticated) {
      await login();
      return;
    }

    setState("loading");
    toast("Creating link...", "info");

    try {
      const wallet = wallets[0] ?? (await createWallet());
      const ethereumProvider = await wallet.getEthereumProvider();
      await ensureMonadTestnet(ethereumProvider);
      const provider = new ethers.BrowserProvider(ethereumProvider);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      const linkId = generateLinkId(address);

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await (contract.createLink as (
        linkId: string,
        amount: bigint,
        description: string
      ) => Promise<{ wait: () => Promise<unknown> }>)(
        linkId,
        ethers.parseEther(amount),
        description,
      );
      await tx.wait();

      const url = `${window.location.origin}/pay/${linkId}`;
      setCreatedUrl(url);
      setState("success");
      toast("Link created!", "success");
    } catch (err: unknown) {
      setState("form");
      if (err && typeof err === "object" && "code" in err) {
        const code = (err as { code: string }).code;
        if (code === "ACTION_REJECTED") {
          setError("Transaction rejected.");
          toast("Transaction failed", "error");
          return;
        }
      }
      setError("Connect an existing wallet or create a new one to continue.");
      toast("Transaction failed", "error");
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(createdUrl);
    setCopied(true);
    toast("Link copied!", "success");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title: "PayLink", url: createdUrl });
    } else {
      await handleCopy();
    }
  }

  function handleBackToForm() {
    setCopied(false);
    setError("");
    setState("form");
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 65px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "480px" }}>
        {/* Heading */}
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: "36px",
            color: "var(--text)",
            margin: "0 0 0.5rem",
            lineHeight: 1.15,
          }}
        >
          Get paid with a link.
        </h1>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "16px",
            color: "var(--text-muted)",
            margin: "0 0 2rem",
          }}
        >
          Create a link. Share it. Keep the receipt — forever.
        </p>

        {/* Form card */}
        {state !== "success" && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            {/* Amount input */}
            <div style={{ position: "relative" }}>
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  outline: "none",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "40px",
                  color: "var(--text)",
                  textAlign: "center",
                  paddingBottom: "0.5rem",
                  paddingRight: "3rem",
                  boxSizing: "border-box",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: 0,
                  bottom: "0.6rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "14px",
                  color: "var(--text-muted)",
                }}
              >
                MON
              </span>
            </div>

            {/* Description input */}
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this payment for?"
              style={{
                width: "100%",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                outline: "none",
                fontFamily: "'Inter', sans-serif",
                fontSize: "16px",
                color: "var(--text)",
                padding: "0.75rem 1rem",
                boxSizing: "border-box",
              }}
            />

            {/* Error */}
            {error && (
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                  color: "var(--error)",
                  margin: 0,
                }}
              >
                {error}
              </p>
            )}

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={isDisabled}
              style={{
                width: "100%",
                height: "52px",
                background: isDisabled
                  ? "rgba(110, 84, 255, 0.4)"
                  : "var(--primary)",
                border: "none",
                borderRadius: "var(--radius)",
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: "16px",
                color: "var(--text)",
                cursor: isDisabled ? "not-allowed" : "pointer",
                transition: "box-shadow var(--transition)",
              }}
              onMouseEnter={(e) => {
                if (!isDisabled) {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "var(--glow-purple)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              {state === "loading" ? (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 22 22"
                    fill="none"
                    style={{ animation: "spin 0.8s linear infinite" }}
                  >
                    <circle
                      cx="11"
                      cy="11"
                      r="9"
                      stroke="white"
                      strokeOpacity="0.25"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M11 2a9 9 0 0 1 9 9"
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              ) : (
                <span>
                  {authenticated ? "Create Payment Link" : "Connect & Create Link"}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Success panel */}
        {state === "success" && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              animation: "slideUp 0.3s ease forwards",
            }}
          >
            {/* Success header */}
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle
                  cx="11"
                  cy="11"
                  r="11"
                  fill="var(--success)"
                  fillOpacity="0.15"
                />
                <path
                  d="M6.5 11.5l3 3 6-6"
                  stroke="var(--success)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: "18px",
                  color: "var(--success)",
                }}
              >
                Link Created
              </span>
            </div>

            {/* URL pill */}
            <div
              style={{
                background: "rgba(110, 84, 255, 0.08)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
              }}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "13px",
                  color: "var(--highlight)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {createdUrl}
              </span>
              <button
                onClick={handleCopy}
                title="Copy link"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.25rem",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  color: copied ? "var(--success)" : "var(--text-muted)",
                  transition: "color var(--transition)",
                }}
              >
                {copied ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M3.5 9.5l3.5 3.5 7.5-7.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect
                      x="6"
                      y="6"
                      width="9"
                      height="9"
                      rx="1.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M4 12H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>
            </div>

            {/* Share button */}
            <div
              style={{
                display: "grid",
                gap: "0.75rem",
              }}
            >
              <button
                onClick={handleShare}
                style={{
                  width: "100%",
                  height: "48px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 600,
                  fontSize: "15px",
                  color: "var(--highlight)",
                  cursor: "pointer",
                  transition:
                    "box-shadow var(--transition), border-color var(--transition)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "var(--glow-purple)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "var(--primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "var(--border)";
                }}
              >
                Share Link
              </button>

              <button
                type="button"
                onClick={handleBackToForm}
                style={{
                  width: "100%",
                  height: "48px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  transition:
                    "box-shadow var(--transition), border-color var(--transition)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "var(--glow-purple)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "var(--primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "var(--border)";
                }}
              >
                Back to form
              </button>
            </div>

            {/* History nudge */}
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                color: "var(--text-muted)",
                margin: 0,
                textAlign: "center",
              }}
            >
              <Link
                href="/history"
                style={{
                  color: "var(--highlight)",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                View in History →
              </Link>
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input::placeholder {
          color: var(--text-muted);
        }
        input:focus {
          border-color: var(--primary) !important;
        }
      `}</style>
    </div>
  );
}
