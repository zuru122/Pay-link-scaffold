"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivySafe, useWalletsSafe } from "@/hooks/usePrivySafe";
import { ethers } from "ethers";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/lib/contract";
import { toast } from "@/hooks/useToast";
import { formatMON, formatTimestamp, truncateAddress } from "@/lib/utils";
import { monadTestnet } from "@/lib/wagmi";

type HistoryLink = {
  linkId: string;
  creator: string;
  direction: "inflow" | "outflow";
  amount: bigint;
  description: string;
  paid: boolean;
  payer: string;
  paidAt: bigint;
  createdAt: bigint;
  paidTxHash: string;
};

type HistoryItem = {
  direction: HistoryLink["direction"];
  linkId: string;
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

function formatCounterpartyLine(item: HistoryLink) {
  const dateLabel =
    item.paidAt === BigInt(0)
      ? "on-chain"
      : formatTimestamp(Number(item.paidAt)).replace(",", "");

  if (item.direction === "outflow") {
    return `Paid to ${truncateAddress(item.creator)} - ${dateLabel}`;
  }

  return formatPaidLine(item.payer, item.paidAt);
}

function getTime(item: HistoryLink) {
  return item.paid ? item.paidAt : item.createdAt;
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
  try {
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
  } catch {
    return BigInt(0);
  }
}

async function getCreatorLinkIdsFromLogs(
  provider: ethers.JsonRpcProvider,
  creator: string,
) {
  try {
    const logs = await provider.getLogs({
      address: CONTRACT_ADDRESS,
      topics: [LINK_CREATED_TOPIC, null, ethers.zeroPadValue(creator, 32)],
      fromBlock: 0,
      toBlock: "latest",
    });

    return logs
      .map((log) => log.topics[1])
      .filter((linkId): linkId is string => Boolean(linkId));
  } catch {
    return [];
  }
}

async function getPaidLogsByPayer(
  provider: ethers.JsonRpcProvider,
  payer: string,
) {
  try {
    return await provider.getLogs({
      address: CONTRACT_ADDRESS,
      topics: [LINK_PAID_TOPIC, null, ethers.zeroPadValue(payer, 32)],
      fromBlock: 0,
      toBlock: "latest",
    });
  } catch {
    return [];
  }
}

async function getPaidTxHash(provider: ethers.JsonRpcProvider, linkId: string) {
  try {
    const logs = await provider.getLogs({
      address: CONTRACT_ADDRESS,
      topics: [LINK_PAID_TOPIC, linkId],
      fromBlock: 0,
      toBlock: "latest",
    });

    return logs.at(-1)?.transactionHash ?? "";
  } catch {
    return "";
  }
}

async function getCreatorLinkIds(
  contract: ethers.Contract,
  creator: string,
) {
  try {
    return Array.from((await contract.getCreatorLinks(creator)) as string[]);
  } catch {
    return [];
  }
}

async function getHistoryLink(
  contract: ethers.Contract,
  item: HistoryItem,
  paidTxHashes: Map<string, string>,
) {
  try {
    const [creator, amount, description, paid, payer, paidAt] =
      (await contract.getLink(item.linkId)) as [
        string,
        bigint,
        string,
        boolean,
        string,
        bigint,
      ];

    return {
      linkId: item.linkId,
      creator,
      direction: item.direction,
      amount,
      description,
      paid,
      payer,
      paidAt,
      createdAt: BigInt(0),
      paidTxHash: paidTxHashes.get(item.linkId) ?? "",
    } satisfies HistoryLink;
  } catch {
    return null;
  }
}

export default function HistoryPage() {
  const router = useRouter();
  const { authenticated, login, ready } = usePrivySafe();
  const { wallets } = useWalletsSafe();
  const walletAddress = wallets[0]?.address ?? "";

  const [history, setHistory] = useState<HistoryLink[]>([]);
  const [loading, setLoading] = useState(false);

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      const aTime = getTime(a);
      const bTime = getTime(b);
      if (aTime === bTime) return 0;

      return aTime > bTime ? -1 : 1;
    });
  }, [history]);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      if (!authenticated || !walletAddress) {
        setHistory([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      toast("Loading history...", "info");

      try {
        const provider = new ethers.JsonRpcProvider(
          monadTestnet.rpcUrls.default.http[0],
        );
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          provider,
        );
        const [creatorLinkIds, createdLogLinkIds, paidLogs] =
          await Promise.all([
            getCreatorLinkIds(contract, walletAddress),
            getCreatorLinkIdsFromLogs(provider, walletAddress),
            getPaidLogsByPayer(provider, walletAddress),
          ]);
        const paidTxHashes = new Map<string, string>();
        const paidLinkIds = paidLogs
          .map((log) => {
            const linkId = log.topics[1];
            if (linkId) paidTxHashes.set(linkId, log.transactionHash);
            return linkId;
          })
          .filter((linkId): linkId is string => Boolean(linkId));
        const inflowLinkIds = Array.from(
          new Set([...creatorLinkIds, ...createdLogLinkIds]),
        );
        const outflowLinkIds = paidLinkIds.filter(
          (linkId) => !inflowLinkIds.includes(linkId),
        );
        const historyItems: HistoryItem[] = [
          ...inflowLinkIds.map((linkId) => ({
            direction: "inflow" as const,
            linkId,
          })),
          ...outflowLinkIds.map((linkId) => ({
            direction: "outflow" as const,
            linkId,
          })),
        ];

        const links = (
          await Promise.all(
            historyItems.map((item) =>
              getHistoryLink(contract, item, paidTxHashes),
            ),
          )
        ).filter((link): link is HistoryLink => Boolean(link));

        if (cancelled) return;

        setHistory(links);

        const enrichedLinks = await Promise.all(
          links.map(async (link) => {
            const [createdAt, paidTxHash] = await Promise.all([
              getCreatedAt(provider, link.linkId, link.creator),
              link.paid && !link.paidTxHash
                ? getPaidTxHash(provider, link.linkId)
                : Promise.resolve(link.paidTxHash),
            ]);

            return {
              ...link,
              createdAt,
              paidTxHash,
            };
          }),
        );

        if (!cancelled) setHistory(enrichedLinks);
      } catch {
        if (!cancelled) {
          setHistory([]);
          toast("Network error. Try again.", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [authenticated, walletAddress]);

  async function copyLink(linkId: string) {
    await navigator.clipboard.writeText(paymentUrl(linkId));
    toast("Copied!", "success");
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

          <div
            className="history-header-actions"
            style={{
              alignItems: "center",
              display: "flex",
              flexShrink: 0,
              flexWrap: "wrap",
              gap: "0.75rem",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={goBack}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--highlight)",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                minHeight: "44px",
                padding: "0 1rem",
                transition: "box-shadow var(--transition)",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.boxShadow = "var(--glow-purple)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.boxShadow = "none";
              }}
            >
              Back
            </button>

            {authenticated && walletAddress && (
              <span
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--highlight)",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "12px",
                  padding: "0.6rem 0.75rem",
                }}
              >
                {truncateAddress(walletAddress)}
              </span>
            )}
          </div>
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
                key={`${item.direction}-${item.linkId}`}
                item={item}
                index={index}
                onCopy={copyLink}
                onShare={shareLink}
              />
            ))}
          </section>
        )}
      </main>

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

          .history-header-actions {
            justify-content: flex-start;
            width: 100%;
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
  const isOutflow = item.direction === "outflow";
  const amountColor = !isPaid
    ? "var(--text-muted)"
    : isOutflow
      ? "var(--text)"
      : "var(--success)";

  return (
    <article
      className="history-card"
      style={{
        animation: "historyCardIn 300ms ease both",
        animationDelay: `${index * 60}ms`,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: !isPaid
          ? "3px solid var(--border)"
          : isOutflow
            ? "3px solid var(--highlight)"
            : "3px solid var(--success)",
        borderRadius: "var(--radius)",
        display: "grid",
        gap: "1rem",
        gridTemplateColumns: "32px 1fr",
        padding: "1.25rem",
        transition: "box-shadow var(--transition), transform var(--transition)",
      }}
    >
      <StatusIcon direction={item.direction} paid={isPaid} />
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
          <TransactionBadge direction={item.direction} paid={isPaid} />
        </div>

        <p
          style={{
            color: amountColor,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "16px",
            fontWeight: 500,
            margin: "0.45rem 0 0",
          }}
        >
          {isPaid ? (isOutflow ? "-" : "+") : ""}
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
            ? formatCounterpartyLine(item)
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

function StatusIcon({
  direction,
  paid,
}: {
  direction: HistoryLink["direction"];
  paid: boolean;
}) {
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

  if (direction === "outflow") {
    return (
      <svg
        aria-hidden="true"
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
      >
        <circle
          cx="14"
          cy="14"
          r="12"
          fill="var(--highlight)"
          fillOpacity="0.15"
        />
        <path
          d="M9 19 19 9M12 9h7v7"
          stroke="var(--highlight)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
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

function TransactionBadge({
  direction,
  paid,
}: {
  direction: HistoryLink["direction"];
  paid: boolean;
}) {
  const label = !paid
    ? "Pending"
    : direction === "outflow"
      ? "Outflow"
      : "Inflow";
  const color = !paid
    ? "var(--highlight)"
    : direction === "outflow"
      ? "var(--highlight)"
      : "var(--success)";

  return (
    <span
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        color,
        flexShrink: 0,
        fontFamily: "'Inter', sans-serif",
        fontSize: "12px",
        padding: "0.25rem 0.5rem",
      }}
    >
      {label}
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
