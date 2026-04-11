import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment History | PayLink",
};

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
