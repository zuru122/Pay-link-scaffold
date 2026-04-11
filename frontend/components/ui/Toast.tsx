"use client";

import type { ToastItem } from "@/hooks/useToast";
import { dismissToast, useToast } from "@/hooks/useToast";

function toastColor(type: ToastItem["type"]) {
  if (type === "success") return "var(--success)";
  if (type === "error") return "var(--error)";
  return "var(--primary)";
}

export function Toaster() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        bottom: "1rem",
        display: "grid",
        gap: "0.75rem",
        maxWidth: "calc(100vw - 2rem)",
        position: "fixed",
        right: "1rem",
        width: "min(360px, calc(100vw - 2rem))",
        zIndex: 50,
      }}
    >
      {toasts.map((toastItem) => (
        <div
          key={toastItem.id}
          role="status"
          style={{
            animation: "toastIn 250ms ease both",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderLeft: `4px solid ${toastColor(toastItem.type)}`,
            borderRadius: "8px",
            boxShadow: "var(--glow-purple)",
            color: "var(--text)",
            fontFamily: "'Inter', sans-serif",
            fontSize: "14px",
            lineHeight: 1.45,
            overflow: "hidden",
            padding: "0.85rem 2.25rem 0.95rem 1rem",
            position: "relative",
          }}
        >
          {toastItem.message}
          <button
            type="button"
            onClick={() => dismissToast(toastItem.id)}
            aria-label="Dismiss notification"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              fontSize: "18px",
              lineHeight: 1,
              minHeight: "28px",
              minWidth: "28px",
              padding: 0,
              position: "absolute",
              right: "0.5rem",
              top: "0.45rem",
            }}
          >
            x
          </button>
          <span
            aria-hidden="true"
            style={{
              animation: "toastProgress 4s linear forwards",
              background: toastColor(toastItem.type),
              bottom: 0,
              height: "2px",
              left: 0,
              position: "absolute",
              transformOrigin: "left",
              width: "100%",
            }}
          />
        </div>
      ))}

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes toastProgress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}
