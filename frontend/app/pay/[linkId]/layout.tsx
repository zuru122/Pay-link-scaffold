import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PayLink — Payment request",
};

export default function PayLinkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
