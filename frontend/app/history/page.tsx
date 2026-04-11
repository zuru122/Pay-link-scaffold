"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/lib/contract";
import { formatMON, formatTimestamp, truncateAddress } from "@/lib/utils";
import { monadTestnet } from "@/lib/wagmi";

type HistoryLink = {
  linkId: string;
  creator: string;
  amount: bigint;
  description: string;
  paid: boolean;
  payer: string;
  paidAt: bigint;
  createdAt: bigint;
  paidTxHash: string;
};

type Toast = {
  message: string;
  type: "info" | "error" | "success";
};

const LINK_CREATED_TOPIC = ethers.id(
  "LinkCreated(bytes32,address,uint256,string)",
);
const LINK_PAID_TOPIC = ethers.id("LinkPaid(bytes32,address,uint256)");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function explorerTxUrl(txHash: string) {
  return `${monadTestnet.blockExplorers.default.url}/tx/${txHash}`;
}

function paymentUrl(linkId: string) {
  if (typeof window === "undefined") return `/pay/${linkId}`;
  return `${window.location.origin}/pay/${linkId}`;
}

function formatCreatedDate(unix: bigint) {
  if (unix === BigInt(0)) return "Created on-chain";

  return `Created ${new Date(Number(unix) * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

function formatPaidLine(payer: string, paidAt: bigint) {
  const payerLabel =
    payer && payer.toLowerCase() !== ZERO_ADDRESS
      ? truncateAddress(payer)
      : "unknown";
  const dateLabel =
    paidAt === BigInt(0)
      ? "on-chain"
      : formatTimestamp(Number(paidAt)).replace(",", "");

  return `Paid by ${payerLabel} - ${dateLabel}`;
}

async function getLogTimestamp(
  provider: ethers.JsonRpcProvider,
  log: ethers.Log,
) {
  const block = await provider.getBlock(log.blockNumber);
  return BigInt(block?.timestamp ?? 0);
}

async function getCreatedAt(
  provider: ethers.JsonRpcProvider,
  linkId: string,
  creator: string,
) {
  const logs = await provider.getLogs({
    address: CONTRACT_ADDRESS,
    topics: [
      LINK_CREATED_TOPIC,
      linkId,
      ethers.zeroPadValue(creator, 32),
    ],
    fromBlock: 0,
    toBlock: "latest",
  });

  const createdLog = logs.at(-1);
  if (!createdLog) return BigInt(0);

  return getLogTimestamp(provider, createdLog);
}

async function getPaidTxHash(provider: ethers.JsonRpcProvider, linkId: string) {
  const logs = await provider.getLogs({
    address: CONTRACT_ADDRESS,
    topics: [LINK_PAID_TOPIC, linkId],
    fromBlock: 0,
    toBlock: "latest",
  });

  return logs.at(-1)?.transactionHash ?? "";
}

export default function HistoryPage() {
  const { authenticated, login, ready } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address ?? "";

  const [history, setHistory] = useState<HistoryLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimeout = useRef<number | null>(null);

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      if (a.paid !== b.paid) return a.paid ? -1 : 1;

      const aTime = a.paid ? a.paidAt : a.createdAt;
      const bTime = b.paid ? b.paidAt : b.createdAt;
      if (aTime === bTime) return 0;

      return aTime > bTime ? -1 : 1;
    });
  }, [history]);

  const showToast = useCallback((message: string, type: Toast["type"]) => {
    if (toastTimeout.current) {
      window.clearTimeout(toastTimeout.current);
    }

    setToast({ message, type });
    toastTimeout.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeout.current) {
        window.clearTimeout(toastTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      if (!authenticated || !walletAddress) {
        setHistory([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const provider = new ethers.JsonRpcProvider(
          monadTestnet.rpcUrls.default.http[0],
        );
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          provider,
        );
        const linkIds = (await contract.getCreatorLinks(walletAddress)) as string[];

        const links = await Promise.all(
          linkIds.map(async (linkId) => {
            const [creator, amount, description, paid, payer, paidAt] =
              (await contract.getLink(linkId)) as [
                string,
                bigint,
                string,
                boolean,
                string,
                bigint,
              ];
            const [createdAt, paidTxHash] = await Promise.all([
              getCreatedAt(provider, linkId, creator),
              paid ? getPaidTxHash(provider, linkId) : Promise.resolve(""),
            ]);

            return {
              linkId,
              creator,
              amount,
              description,
              paid,
              payer,
              paidAt,
              createdAt,
              paidTxHash,
            };
          }),
        );

        if (!cancelled) setHistory(links);
      } catch {
        if (!cancelled) {
          setHistory([]);
          showToast("Network error. Try again.", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [authenticated, showToast, walletAddress]);

  async function copyLink(linkId: string) {
    await navigator.clipboard.writeText(paymentUrl(linkId));
    showToast("Copied!", "success");
  }

  async function shareLink(linkId: string, description: string) {
    const url = paymentUrl(linkId);

    if (navigator.share) {
      await navigator.share({ title: description || "PayLink", url });
      return;
    }

    await copyLink(linkId);
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 65px)",
        padding: "2rem 1rem",
      }}
    >
      <main
        style={{
          margin: "0 auto",
          maxWidth: "760px",
          width: "100%",
        }}
      >
        <header
          className="history-header"
          style={{
            alignItems: "flex-start",
            display: "flex",
            gap: "1rem",
            justifyContent: "space-between",
            marginBottom: "2rem",
          }}
        >
          <div>
            <h1
              style={{
                color: "var(--text)",
                fontFamily: "'Syne', sans-serif",
                fontSize: "28px",
                fontWeight: 700,
                lineHeight: 1.15,
                margin: "0 0 0.5rem",
              }}
            >
              Payment History
            </h1>
            <p
              style={{
                color: "var(--text-muted)",
                fontFamily: "'Inter', sans-serif",
                fontSize: "16px",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Your on-chain payment record. Permanent. Verifiable.
            </p>
          </div>

          {authenticated && walletAddress && (
            <span
              style={{
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--highlight)",
                flexShrink: 0,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
                padding: "0.6rem 0.75rem",
              }}
            >
              {truncateAddress(walletAddress)}
            </span>
          )}
        </header>

        {!authenticated ? (
          <ConnectState onConnect={login} ready={ready} />
        ) : loading ? (
          <SkeletonList />
        ) : sortedHistory.length === 0 ? (
          <EmptyState />
        ) : (
          <section style={{ display: "grid", gap: "1rem" }}>
            {sortedHistory.map((item, index) => (
              <HistoryCard
                key={item.linkId}
                item={item}
                index={index}
                onCopy={copyLink}
                onShare={shareLink}
              />
            ))}
          </section>
        )}
      </main>

      {toast && (
        <div
          role="status"
          style={{
            background: "var(--surface)",
            border: `1px solid ${
              toast.type === "error"
                ? "var(--error)"
                : toast.type === "success"
                  ? "var(--success)"
                  : "var(--border)"
            }`,
            borderRadius: "8px",
            bottom: "1rem",
            boxShadow: toast.type === "error" ? "none" : "var(--glow-purple)",
            color:
              toast.type === "error"
                ? "var(--error)"
                : toast.type === "success"
                  ? "var(--success)"
                  : "var(--highlight)",
            fontFamily: "'Inter', sans-serif",
            fontSize: "14px",
            left: "50%",
            maxWidth: "calc(100% - 2rem)",
            padding: "0.8rem 1rem",
            position: "fixed",
            transform: "translateX(-50%)",
            zIndex: 20,
          }}
        >
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes historyCardIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shimmer {
          0% { background-position: -760px 0; }
          100% { background-position: 760px 0; }
        }

        .history-card:hover {
          box-shadow: var(--glow-purple);
          transform: translateY(-2px);
        }

        @media (max-width: 560px) {
          .history-header {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

function ConnectState({
  onConnect,
  ready,
}: {
  onConnect: () => void;
  ready: boolean;
}) {
  return (
    <section
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h2
        style={{
          color: "var(--text)",
          fontFamily: "'Syne', sans-serif",
          fontSize: "20px",
          fontWeight: 700,
          margin: "0 0 1rem",
        }}
      >
        Connect wallet to view your history
      </h2>
      <button
        type="button"
        onClick={onConnect}
        disabled={!ready}
        style={{
          background: "var(--primary)",
          border: "none",
          borderRadius: "var(--radius)",
          color: "var(--text)",
          cursor: ready ? "pointer" : "not-allowed",
          fontFamily: "'Syne', sans-serif",
          fontSize: "16px",
          fontWeight: 700,
          minHeight: "44px",
          opacity: ready ? 1 : 0.6,
          padding: "0 1.25rem",
          transition: "box-shadow var(--transition)",
        }}
        onMouseEnter={(event) => {
          if (ready) event.currentTarget.style.boxShadow = "var(--glow-purple)";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.boxShadow = "none";
        }}
      >
        Connect
      </button>
    </section>
  );
}

function EmptyState() {
  return (
    <section
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <svg
        aria-hidden="true"
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        style={{ margin: "0 auto 1rem" }}
      >
        <path
          d="M14 6h20l6 6v30H14V6Z"
          stroke="var(--primary)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path
          d="M34 6v8h6M20 22h14M20 29h14M20 36h8"
          stroke="var(--primary)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
      <h2
        style={{
          color: "var(--text)",
          fontFamily: "'Syne', sans-serif",
          fontSize: "20px",
          fontWeight: 700,
          margin: "0 0 0.5rem",
        }}
      >
        No payments yet.
      </h2>
      <p
        style={{
          color: "var(--text-muted)",
          fontFamily: "'Inter', sans-serif",
          fontSize: "15px",
          margin: "0 0 1.5rem",
        }}
      >
        Create your first link to get started.
      </p>
      <Link
        href="/"
        style={{
          alignItems: "center",
          background: "var(--primary)",
          borderRadius: "var(--radius)",
          color: "var(--text)",
          display: "inline-flex",
          fontFamily: "'Syne', sans-serif",
          fontSize: "16px",
          fontWeight: 700,
          minHeight: "44px",
          padding: "0 1.25rem",
          textDecoration: "none",
          transition: "box-shadow var(--transition)",
        }}
      >
        Create a Link
      </Link>
    </section>
  );
}

function HistoryCard({
  item,
  index,
  onCopy,
  onShare,
}: {
  item: HistoryLink;
  index: number;
  onCopy: (linkId: string) => Promise<void>;
  onShare: (linkId: string, description: string) => Promise<void>;
}) {
  const isPaid = item.paid;

  return (
    <article
      className="history-card"
      style={{
        animation: "historyCardIn 300ms ease both",
        animationDelay: `${index * 60}ms`,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: isPaid
          ? "3px solid var(--success)"
          : "3px solid var(--border)",
        borderRadius: "var(--radius)",
        display: "grid",
        gap: "1rem",
        gridTemplateColumns: "32px 1fr",
        padding: "1.25rem",
        transition: "box-shadow var(--transition), transform var(--transition)",
      }}
    >
      <StatusIcon paid={isPaid} />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            alignItems: "flex-start",
            display: "flex",
            gap: "0.75rem",
            justifyContent: "space-between",
          }}
        >
          <h2
            style={{
              color: "var(--text)",
              fontFamily: "'Syne', sans-serif",
              fontSize: "18px",
              fontWeight: 700,
              lineHeight: 1.35,
              margin: 0,
              overflowWrap: "anywhere",
            }}
          >
            {item.description || "Untitled payment"}
          </h2>
          {!isPaid && <AwaitingBadge />}
        </div>

        <p
          style={{
            color: isPaid ? "var(--success)" : "var(--text-muted)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "16px",
            fontWeight: 500,
            margin: "0.45rem 0 0",
          }}
        >
          {formatMON(item.amount)}
        </p>

        <p
          style={{
            color: "var(--text-muted)",
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            lineHeight: 1.5,
            margin: "0.35rem 0 0",
          }}
        >
          {isPaid
            ? formatPaidLine(item.payer, item.paidAt)
            : `Awaiting payment - ${formatCreatedDate(item.createdAt)}`}
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginTop: "1rem",
          }}
        >
          {isPaid && item.paidTxHash && (
            <Link
              href={explorerTxUrl(item.paidTxHash)}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "var(--highlight)",
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                minHeight: "44px",
                paddingTop: "0.8rem",
                textDecoration: "none",
              }}
            >
              View on Explorer ↗
            </Link>
          )}

          <ActionButton onClick={() => onCopy(item.linkId)}>Copy Link</ActionButton>
          {!isPaid && (
            <ActionButton onClick={() => onShare(item.linkId, item.description)}>
              Share
            </ActionButton>
          )}
        </div>
      </div>
    </article>
  );
}

function StatusIcon({ paid }: { paid: boolean }) {
  if (!paid) {
    return (
      <svg
        aria-hidden="true"
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
      >
        <circle cx="14" cy="14" r="10" stroke="var(--border)" strokeWidth="2" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
    >
      <circle cx="14" cy="14" r="12" fill="var(--success)" fillOpacity="0.15" />
      <path
        d="M8.5 14.5l3.5 3.5 7.5-8"
        stroke="var(--success)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function AwaitingBadge() {
  return (
    <span
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        color: "var(--highlight)",
        flexShrink: 0,
        fontFamily: "'Inter', sans-serif",
        fontSize: "12px",
        padding: "0.25rem 0.5rem",
      }}
    >
      Awaiting
    </span>
  );
}

function ActionButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        color: "var(--highlight)",
        cursor: "pointer",
        fontFamily: "'Inter', sans-serif",
        fontSize: "13px",
        minHeight: "44px",
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}

function SkeletonList() {
  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      {[0, 1, 2].map((index) => (
        <SkeletonCard key={index} index={index} />
      ))}
    </section>
  );
}

function SkeletonCard({ index }: { index: number }) {
  const shimmer = {
    animation: "shimmer 1.2s ease-in-out infinite",
    background:
      "linear-gradient(90deg, var(--surface) 0%, var(--border) 50%, var(--surface) 100%)",
    backgroundSize: "760px 100%",
    borderRadius: "8px",
  };

  return (
    <div
      style={{
        animation: "historyCardIn 300ms ease both",
        animationDelay: `${index * 60}ms`,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--border)",
        borderRadius: "var(--radius)",
        display: "grid",
        gap: "1rem",
        gridTemplateColumns: "32px 1fr",
        padding: "1.25rem",
      }}
    >
      <div style={{ ...shimmer, height: "28px", width: "28px" }} />
      <div>
        <div style={{ ...shimmer, height: "18px", width: "72%" }} />
        <div
          style={{
            ...shimmer,
            height: "16px",
            marginTop: "0.75rem",
            width: "28%",
          }}
        />
        <div
          style={{
            ...shimmer,
            height: "14px",
            marginTop: "0.75rem",
            width: "58%",
          }}
        />
      </div>
    </div>
  );
}
