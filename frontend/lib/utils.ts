import { ethers } from "ethers";

export function generateLinkId(address: string): string {
  return ethers.solidityPackedKeccak256(
    ["address", "string", "string"],
    [address, Math.random().toString(36).substring(2), Date.now().toString()],
  );
}

export function truncateAddress(addr: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatTimestamp(unix: number): string {
  return new Date(unix * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatMON(wei: bigint): string {
  return `${parseFloat(ethers.formatEther(wei)).toFixed(2)} MON`;
}
