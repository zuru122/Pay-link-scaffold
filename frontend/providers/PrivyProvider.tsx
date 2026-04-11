"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { monadTestnet } from "@/lib/wagmi";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? ""}
      config={{
        loginMethods: ["google", "email"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "all-users",
          },
        },
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
