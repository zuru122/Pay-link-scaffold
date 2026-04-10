export function generateLinkId(address: string): string {
  const rand = Math.random().toString(36).substring(2);
  const ts = Date.now().toString();
  const raw = address + rand + ts;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (Math.imul(31, hash) + raw.charCodeAt(i)) | 0;
  }
  return "0x" + Math.abs(hash).toString(16).padStart(64, "0");
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
  const eth = Number(wei) / 1e18;
  return `${eth.toFixed(2)} MON`;
}
