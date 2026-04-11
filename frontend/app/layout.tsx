import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/Toast";
import Providers from "@/providers/PrivyProvider";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "PayLink — Get paid with a link",
    template: "%s",
  },
  description: "Instant on-chain payments with permanent receipts. Powered by Monad.",
  openGraph: {
    description:
      "Instant on-chain payments with permanent receipts. Powered by Monad.",
    title: "PayLink — Get paid with a link",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <Navbar />
          <main>{children}</main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
