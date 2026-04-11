import { ethers } from "ethers";
import PaymentClient, { type InitialLinkDetails } from "./PaymentClient";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/lib/contract";
import { monadTestnet } from "@/lib/wagmi";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const LINK_ID_PATTERN = /^0x[0-9a-fA-F]{64}$/;

export const dynamic = "force-dynamic";

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

async function getInitialLink(linkId: string): Promise<{
  link: InitialLinkDetails | null;
  notFound: boolean;
}> {
  if (!LINK_ID_PATTERN.test(linkId) || !ethers.isAddress(CONTRACT_ADDRESS)) {
    return { link: null, notFound: true };
  }

  try {
    const provider = new ethers.JsonRpcProvider(
      monadTestnet.rpcUrls.default.http[0],
    );
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const [creator, amount, description, paid, payer, paidAt] =
      (await withTimeout(
        contract.getLink(linkId) as Promise<
          [string, bigint, string, boolean, string, bigint]
        >,
        8000,
      )) as [string, bigint, string, boolean, string, bigint];

    if (!creator || creator.toLowerCase() === ZERO_ADDRESS) {
      return { link: null, notFound: true };
    }

    return {
      link: {
        creator,
        amount: amount.toString(),
        description,
        paid,
        payer,
        paidAt: paidAt.toString(),
      },
      notFound: false,
    };
  } catch {
    return { link: null, notFound: false };
  }
}

export default async function PayPage({
  params,
}: {
  params: { linkId: string };
}) {
  const { link, notFound } = await getInitialLink(params.linkId);

  return (
    <PaymentClient
      initialLink={link}
      initialNotFound={notFound}
      linkId={params.linkId}
    />
  );
}
