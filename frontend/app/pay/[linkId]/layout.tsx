import type { Metadata } from "next";
import { ethers } from "ethers";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/lib/contract";
import { monadTestnet } from "@/lib/wagmi";

export async function generateMetadata({
  params,
}: {
  params: { linkId: string };
}): Promise<Metadata> {
  try {
    const provider = new ethers.JsonRpcProvider(
      monadTestnet.rpcUrls.default.http[0],
    );
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const [, amount] = (await contract.getLink(params.linkId)) as [
      string,
      bigint,
      string,
      boolean,
      string,
      bigint,
    ];
    const amountLabel = parseFloat(ethers.formatEther(amount)).toFixed(2);

    return {
      title: `Pay ${amountLabel} MON | PayLink`,
    };
  } catch {
    return {
      title: "PayLink — Get paid with a link",
    };
  }
}

export default function PayLinkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
