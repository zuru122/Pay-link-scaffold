import { monadTestnet } from "@/lib/wagmi";

type Eip1193Provider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

function isProviderError(error: unknown, code: number) {
  if (!error || typeof error !== "object" || !("code" in error)) return false;

  const errorCode = (error as { code?: unknown }).code;
  return errorCode === code || errorCode === String(code);
}

export async function ensureMonadTestnet(provider: Eip1193Provider) {
  const chainId = `0x${monadTestnet.id.toString(16)}`;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
    return;
  } catch (error) {
    if (!isProviderError(error, 4902)) {
      throw error;
    }
  }

  await provider.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId,
        chainName: monadTestnet.name,
        nativeCurrency: monadTestnet.nativeCurrency,
        rpcUrls: monadTestnet.rpcUrls.default.http,
        blockExplorerUrls: [monadTestnet.blockExplorers.default.url],
      },
    ],
  });

  await provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId }],
  });
}
