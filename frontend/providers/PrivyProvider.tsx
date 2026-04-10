"use client";

import { PrivyProvider } from "@privy-io/react-auth";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

export default function Providers({ children }: { children: React.ReactNode }) {
  // During build/SSR, the app ID is not available — render children directly.
  // In production, NEXT_PUBLIC_PRIVY_APP_ID must be set.
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        defaultChain: { id: 10143, name: "Monad Testnet" } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supportedChains: [{ id: 10143, name: "Monad Testnet" } as any],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
