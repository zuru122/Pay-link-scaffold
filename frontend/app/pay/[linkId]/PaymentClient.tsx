"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCreateWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/lib/contract";
import { toast } from "@/hooks/useToast";
import { formatMON, truncateAddress } from "@/lib/utils";
import { monadTestnet } from "@/lib/wagmi";
import { ensureMonadTestnet } from "@/lib/walletNetwork";

type LinkDetails = {
  creator: string;
  amount: bigint;
  description: string;
  paid: boolean;
  payer: string;
  paidAt: bigint;
};

export type InitialLinkDetails = {
  creator: string;
  amount: string;
  description: string;
  paid: boolean;
  payer: string;
  paidAt: string;
};

type PayState = "idle" | "pending" | "success";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const LINK_PAID_TOPIC = ethers.id("LinkPaid(bytes32,address,uint256)");

function explorerTxUrl(txHash: string) {
  return `${monadTestnet.blockExplorers.default.url}/tx/${txHash}`;
}

function deserializeLink(link: InitialLinkDetails): LinkDetails {
  return {
    ...link,
    amount: BigInt(link.amount),
    paidAt: BigInt(link.paidAt),
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Request timed out"));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}

function formatPaidDate(unix: bigint, includeTime: boolean) {
  if (unix === BigInt(0)) return "";

  const date = new Date(Number(unix) * 1000);
  const dateLabel = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (!includeTime) return `Paid on ${dateLabel}`;

  const timeLabel = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `Paid on ${dateLabel} at ${timeLabel}`;
}

async function findPaymentTxHash(linkId: string) {
  const provider = new ethers.JsonRpcProvider(monadTestnet.rpcUrls.default.http[0]);
  const logs = await withTimeout(
    provider.getLogs({
      address: CONTRACT_ADDRESS,
      topics: [LINK_PAID_TOPIC, linkId],
      fromBlock: 0,
      toBlock: "latest",
    }),
    8000,
  );

  return logs.at(-1)?.transactionHash ?? "";
}

export default function PaymentClient({
  initialLink,
  initialNotFound,
  linkId,
}: {
  initialLink: InitialLinkDetails | null;
  initialNotFound: boolean;
  linkId: string;
}) {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const hasInitialLink = Boolean(initialLink);
  const invalidContractAddress = !ethers.isAddress(CONTRACT_ADDRESS);

  const [link, setLink] = useState<LinkDetails | null>(() =>
    initialLink ? deserializeLink(initialLink) : null,
  );
  const [loading, setLoading] = useState(!initialLink && !initialNotFound);
  const [notFound, setNotFound] = useState(initialNotFound);
  const [payState, setPayState] = useState<PayState>("idle");
  const [txHash, setTxHash] = useState("");
  const [paidAt, setPaidAt] = useState<bigint>(() =>
    initialLink ? BigInt(initialLink.paidAt) : BigInt(0),
  );

  const walletAddress = wallets[0]?.address ?? "";
  const amountLabel = useMemo(() => (link ? formatMON(link.amount) : ""), [link]);
  const receiptMode = Boolean(link?.paid || payState === "success");

  if (invalidContractAddress) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 65px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1rem",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "440px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              color: "var(--text)",
              fontFamily: "'Syne', sans-serif",
              fontSize: "20px",
              fontWeight: 700,
              margin: 0,
            }}
          >
            Contract address not configured.
          </p>
          <p
            style={{
              color: "var(--text-muted)",
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              margin: "1rem 0 0",
            }}
          >
            Set NEXT_PUBLIC_CONTRACT_ADDRESS to a valid Monad Testnet contract address.
          </p>
        </div>
      </div>
    );
  }

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadLink() {
      if (!hasInitialLink) setLoading(true);
      setNotFound(false);

      try {
        const provider = new ethers.JsonRpcProvider(
          monadTestnet.rpcUrls.default.http[0],
        );
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          provider,
        );
        const [creator, amount, description, paid, payer, paidAtValue] =
          (await withTimeout(
            contract.getLink(linkId) as Promise<
              [string, bigint, string, boolean, string, bigint]
            >,
            8000,
          )) as [string, bigint, string, boolean, string, bigint];

        if (cancelled) return;

        if (!creator || creator.toLowerCase() === ZERO_ADDRESS) {
          if (!hasInitialLink) {
            setNotFound(true);
            setLink(null);
          }
          return;
        }

        setLink({
          creator,
          amount,
          description,
          paid,
          payer,
          paidAt: paidAtValue,
        });
        setPaidAt(paidAtValue);

        if (paid) {
          try {
            const existingTxHash = await findPaymentTxHash(linkId);
            if (!cancelled) setTxHash(existingTxHash);
          } catch {
            if (!cancelled) setTxHash("");
          }
        }
      } catch {
        if (!cancelled) {
          if (!hasInitialLink) {
            setNotFound(true);
            setLink(null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadLink();

    return () => {
      cancelled = true;
    };
  }, [hasInitialLink, linkId]);

  async function handlePay() {
    if (!link || payState === "pending" || receiptMode) return;

    if (!authenticated) {
      toast("Connecting wallet...", "info");
      await login();
      return;
    }

    setPayState("pending");
    toast("Confirm in your wallet...", "info");

    try {
      const wallet = wallets[0] ?? (await createWallet());
      const ethereumProvider = await wallet.getEthereumProvider();
      await ensureMonadTestnet(ethereumProvider);
      const provider = new ethers.BrowserProvider(ethereumProvider);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await (contract.pay as (
        id: string,
        overrides: { value: bigint },
      ) => Promise<ethers.TransactionResponse>)(linkId, { value: link.amount });
      const receipt = await tx.wait();
      const paymentTime = BigInt(Math.floor(Date.now() / 1000));
      const payer = await signer.getAddress();

      setTxHash(receipt?.hash ?? tx.hash);
      setPaidAt(paymentTime);
      setLink({
        ...link,
        paid: true,
        payer,
        paidAt: paymentTime,
      });
      setPayState("success");
      toast("Payment confirmed!", "success");
    } catch (err: unknown) {
      setPayState("idle");
      if (err && typeof err === "object" && "code" in err) {
        const code = (err as { code?: string | number }).code;
        if (code === "ACTION_REJECTED" || code === "4001" || code === 4001) {
          toast("Transaction rejected", "error");
          return;
        }
      }
      if (
        err instanceof Error &&
        err.message.toLowerCase().includes("chain")
      ) {
        toast("Switch to Monad Testnet", "error");
        return;
      }
      if (
        err instanceof Error &&
        err.message.toLowerCase().includes("user rejected")
      ) {
        toast("Transaction rejected", "error");
        return;
      }
      toast("Network error. Try again.", "error");
    }
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 65px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: "440px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1rem",
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
          <Link
            href="/"
            style={{
              color: "var(--text-muted)",
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            Create a link
          </Link>
        </div>

        {loading && <PaymentSkeleton />}

        {!loading && notFound && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "2rem",
              textAlign: "center",
            }}
          >
            <p
              style={{
                color: "var(--text)",
                fontFamily: "'Syne', sans-serif",
                fontSize: "20px",
                fontWeight: 700,
                margin: 0,
              }}
            >
              This link doesn&apos;t exist.
            </p>
          </div>
        )}

        {!loading && link && (
          <div
            style={{
              background: "var(--surface)",
              border: receiptMode
                ? "1px solid var(--success)"
                : "1px solid var(--border)",
              borderRadius: "var(--radius)",
              boxShadow: receiptMode ? "var(--glow-green)" : "none",
              padding: "2rem",
              transition:
                "border-color 500ms ease, box-shadow 500ms ease",
            }}
          >
            <p
              style={{
                color: "var(--text-muted)",
                fontFamily: "'Inter', sans-serif",
                fontSize: "12px",
                letterSpacing: "0.08em",
                margin: "0 0 1.25rem",
                textTransform: "uppercase",
              }}
            >
              Payment Request
            </p>

            <p
              style={{
                animation: "amountPulse 520ms ease both",
                color: "var(--text)",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "clamp(36px, 8vw, 52px)",
                lineHeight: 1,
                margin: 0,
              }}
            >
              {amountLabel}
            </p>

            <p
              style={{
                color: "var(--text-muted)",
                fontFamily: "'Inter', sans-serif",
                fontSize: "16px",
                lineHeight: 1.5,
                margin: "1rem 0 0",
              }}
            >
              {link.description}
            </p>

            <Divider />

            <div style={{ display: "grid", gap: "0.75rem" }}>
              <MetaRow label="From:" value={truncateAddress(link.creator)} />
            </div>

            <Divider />

            {receiptMode ? (
              <ReceiptState
                paidAlready={link.paid && payState !== "success"}
                txHash={txHash}
                paidAt={paidAt}
                payer={link.payer}
              />
            ) : (
              <PayButton
                ready={ready}
                authenticated={authenticated}
                amountLabel={amountLabel}
                walletAddress={walletAddress}
                payState={payState}
                onPay={handlePay}
              />
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes amountPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.015); }
          100% { transform: scale(1); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes shimmer {
          0% { background-position: -440px 0; }
          100% { background-position: 440px 0; }
        }

        @keyframes checkDraw {
          from { stroke-dashoffset: 120; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        borderTop: "1px solid var(--border)",
        margin: "1.5rem 0",
      }}
    />
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        justifyContent: "space-between",
        gap: "1rem",
      }}
    >
      <span
        style={{
          color: "var(--text-muted)",
          fontFamily: "'Inter', sans-serif",
          fontSize: "13px",
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: "var(--text-muted)",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "13px",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function PayButton({
  ready,
  authenticated,
  amountLabel,
  walletAddress,
  payState,
  onPay,
}: {
  ready: boolean;
  authenticated: boolean;
  amountLabel: string;
  walletAddress: string;
  payState: PayState;
  onPay: () => void;
}) {
  const disabled = !ready || payState === "pending";

  return (
    <div>
      <button
        type="button"
        onClick={onPay}
        disabled={disabled}
        style={{
          alignItems: "center",
          background: "var(--primary)",
          border: "none",
          borderRadius: "var(--radius)",
          color: "var(--text)",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          fontFamily: "'Syne', sans-serif",
          fontSize: "16px",
          fontWeight: 700,
          height: "52px",
          justifyContent: "center",
          opacity: disabled && payState !== "pending" ? 0.6 : 1,
          transition: "box-shadow var(--transition)",
          width: "100%",
        }}
        onMouseEnter={(event) => {
          if (!disabled) event.currentTarget.style.boxShadow = "var(--glow-purple)";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.boxShadow = "none";
        }}
      >
        {payState === "pending" ? (
          <svg
            aria-label="Payment pending"
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
              stroke="var(--text)"
              strokeOpacity="0.25"
              strokeWidth="2.5"
            />
            <path
              d="M11 2a9 9 0 0 1 9 9"
              stroke="var(--text)"
              strokeLinecap="round"
              strokeWidth="2.5"
            />
          </svg>
        ) : authenticated ? (
          `Confirm & Pay ${amountLabel}`
        ) : (
          "Pay with Google"
        )}
      </button>

      {authenticated && walletAddress && payState !== "pending" && (
        <p
          style={{
            color: "var(--text-muted)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "12px",
            margin: "0.75rem 0 0",
            textAlign: "center",
          }}
        >
          {truncateAddress(walletAddress)}
        </p>
      )}
    </div>
  );
}

function ReceiptState({
  paidAlready,
  txHash,
  paidAt,
  payer,
}: {
  paidAlready: boolean;
  txHash: string;
  paidAt: bigint;
  payer: string;
}) {
  const paidDate = formatPaidDate(paidAt, !paidAlready);
  const hasPayer = payer && payer.toLowerCase() !== ZERO_ADDRESS;

  return (
    <div style={{ textAlign: "center" }}>
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        <circle
          cx="36"
          cy="36"
          r="31"
          stroke="var(--success)"
          strokeOpacity="0.35"
          strokeWidth="3"
        />
        <path
          d="M22 37.5l9 9 20-22"
          stroke="var(--success)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
          style={{
            animation: paidAlready ? "none" : "checkDraw 600ms ease forwards",
            strokeDasharray: 120,
            strokeDashoffset: paidAlready ? 0 : 120,
          }}
        />
      </svg>

      <p
        style={{
          color: "var(--text)",
          fontFamily: "'Syne', sans-serif",
          fontSize: "20px",
          fontWeight: 700,
          margin: "1rem 0 0",
        }}
      >
        Payment sent
      </p>

      {paidAlready && hasPayer && (
        <p
          style={{
            color: "var(--text-muted)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "13px",
            margin: "0.75rem 0 0",
          }}
        >
          Paid by {truncateAddress(payer)}
        </p>
      )}

      {txHash ? (
        <Link
          href={explorerTxUrl(txHash)}
          target="_blank"
          rel="noreferrer"
          style={{
            color: "var(--success)",
            display: "inline-block",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "13px",
            marginTop: "0.75rem",
            textDecoration: "none",
          }}
        >
          {truncateAddress(txHash)} - Monad Explorer
        </Link>
      ) : (
        <p
          style={{
            color: "var(--text-muted)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "13px",
            margin: "0.75rem 0 0",
          }}
        >
          Receipt stored on Monad
        </p>
      )}

      {paidDate && (
        <p
          style={{
            color: "var(--text-muted)",
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            margin: "0.75rem 0 0",
          }}
        >
          {paidDate}
        </p>
      )}

      <p
        style={{
          color: "var(--text-muted)",
          fontFamily: "'Inter', sans-serif",
          fontSize: "12px",
          margin: "1rem 0 0",
        }}
      >
        This receipt is permanently stored on Monad.
      </p>
    </div>
  );
}

function PaymentSkeleton() {
  const shimmer = {
    animation: "shimmer 1.2s ease-in-out infinite",
    background:
      "linear-gradient(90deg, var(--surface) 0%, var(--border) 50%, var(--surface) 100%)",
    backgroundSize: "440px 100%",
    borderRadius: "8px",
  };

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "2rem",
      }}
    >
      <div style={{ ...shimmer, height: "14px", width: "42%" }} />
      <div
        style={{
          ...shimmer,
          height: "56px",
          marginTop: "1.25rem",
          width: "78%",
        }}
      />
      <div
        style={{
          ...shimmer,
          height: "18px",
          marginTop: "1rem",
          width: "92%",
        }}
      />
      <Divider />
      <div style={{ ...shimmer, height: "16px", width: "70%" }} />
      <Divider />
      <div style={{ ...shimmer, height: "52px", width: "100%" }} />
    </div>
  );
}
