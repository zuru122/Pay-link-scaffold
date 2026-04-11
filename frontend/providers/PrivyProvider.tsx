"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { monadTestnet } from "@/lib/wagmi";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

export default function Providers({ children }: { children: React.ReactNode }) {
  if (!PRIVY_APP_ID) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["google", "email"],
        embeddedWallets: {
          ethereum: { createOnLogin: "all-users" },
        },
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
