const BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getHealth() {
  return fetchJSON<{ status: string; totalMinted: number }>("/api/health");
}

export async function getPassportCount() {
  return fetchJSON<{ count: number }>("/api/passports/count");
}

export async function getPassport(tokenId: number) {
  return fetchJSON<{
    tokenId: number;
    model: string;
    serialNumber: string;
    capacity: number;
    chemistry: string;
    stage: string;
    stageIndex: number;
    stolen: boolean;
    assembler: string;
    currentOwner: string;
    tokenURI: string;
    documents: {
      ipfsHash: string;
      docType: string;
      timestamp: number;
      addedBy: string;
    }[];
  }>(`/api/passports/${tokenId}`);
}

export async function listPassports(limit = 20) {
  return fetchJSON<{
    total: number;
    passports: {
      tokenId: number;
      model: string;
      serialNumber: string;
      capacity: number;
      chemistry: string;
      stage: string;
      stageIndex: number;
      stolen: boolean;
      assembler: string;
      currentOwner: string;
    }[];
  }>(`/api/passports?limit=${limit}`);
}

export async function getRoles(address: string) {
  return fetchJSON<{ address: string; roles: string[] }>(`/api/roles/${address}`);
}

export async function getEvents(tokenId?: number, limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (tokenId !== undefined) params.set("token_id", String(tokenId));
  return fetchJSON<{ events: any[] }>(`/api/events?${params}`);
}

export async function getStages() {
  return fetchJSON<{ stages: string[] }>("/api/stages");
}

export async function uploadToIPFS(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/api/ipfs/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`);
  return res.json() as Promise<{ cid: string; uri: string; gateway: string }>;
}
