import { useCreateWallet, usePrivy, useWallets } from "@privy-io/react-auth";

export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
export const PRIVY_ENABLED = Boolean(PRIVY_APP_ID);

const noop = async () => undefined;

export function usePrivySafe() {
  if (!PRIVY_ENABLED) {
    return {
      ready: false,
      authenticated: false,
      login: noop,
      logout: noop,
    } as const;
  }

  return usePrivy();
}

export function useWalletsSafe() {
  if (!PRIVY_ENABLED) {
    return { wallets: [] as [] };
  }

  return useWallets();
}

export function useCreateWalletSafe() {
  if (!PRIVY_ENABLED) {
    return {
      createWallet: async () => {
        throw new Error("Privy is not configured.");
      },
    };
  }

  return useCreateWallet();
}
