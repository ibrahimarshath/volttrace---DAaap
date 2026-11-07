"use client";

import { useState, useEffect } from "react";
import WalletButton from "@/components/WalletButton";
import StageBar from "@/components/StageBar";
import { listPassports, uploadToIPFS } from "@/lib/api";
import { connectWallet } from "@/lib/wallet";
import { getWriteContract } from "@/lib/contract";

interface Passport {
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
}

export default function Dashboard() {
  const [passports, setPassports] = useState<Passport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<any>(null);

  // Create passport form
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    model: "",
    serialNumber: "",
    capacity: "",
    chemistry: "",
  });
  const [txState, setTxState] = useState<
    "idle" | "uploading" | "pending" | "confirming" | "done" | "error"
  >("idle");
  const [txHash, setTxHash] = useState("");
  const [txError, setTxError] = useState("");

  async function loadPassports() {
    try {
      const data = await listPassports();
      setPassports(data.passports);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to load passports:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPassports();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet?.signer) {
      alert("Connect wallet first");
      return;
    }

    setTxState("uploading");
    setTxError("");
    try {
      // 1. Build metadata JSON
      const batteryId = `${form.model}-${form.serialNumber}`;
      const metadata = {
        name: `VoltTrace Battery #${batteryId}`,
        description: "EV Battery Passport on VoltTrace",
        attributes: [
          { trait_type: "Model", value: form.model },
          { trait_type: "Serial Number", value: form.serialNumber },
          { trait_type: "Capacity (Wh)", value: form.capacity },
          { trait_type: "Chemistry", value: form.chemistry },
        ],
      };

      // 2. Upload metadata JSON to IPFS via backend
      const blob = new Blob([JSON.stringify(metadata, null, 2)], {
        type: "application/json",
      });
      const file = new File([blob], `${batteryId}.json`, {
        type: "application/json",
      });
      const ipfsResult = await uploadToIPFS(file);

      // 3. Call createPassport(batteryId, ipfsUri) on-chain
      setTxState("pending");
      const contract = getWriteContract(wallet.signer);
      const tx = await contract.createPassport(batteryId, ipfsResult.uri);
      setTxHash(tx.hash);
      setTxState("confirming");
      await tx.wait();
      setTxState("done");
      setForm({ model: "", serialNumber: "", capacity: "", chemistry: "" });
      // Reload passports after a short delay
      setTimeout(() => {
        loadPassports();
        setShowCreate(false);
        setTxState("idle");
      }, 2000);
    } catch (err: any) {
      setTxState("error");
      setTxError(err.reason || err.message || "Transaction failed");
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-400 mt-1">
            {total} passport{total !== 1 ? "s" : ""} on-chain
          </p>
        </div>
        <div className="flex items-center gap-4">
          {wallet?.roles?.includes("ASSEMBLER") && (
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="px-4 py-2 bg-volt-600 hover:bg-volt-700 text-white text-sm font-medium rounded-lg transition"
            >
              + Create Passport
            </button>
          )}
          <WalletButton onConnect={setWallet} />
        </div>
      </div>

      {/* Create Passport Form */}
      {showCreate && (
        <div className="mb-8 p-6 bg-gray-900 border border-gray-800 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">Create New Passport</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Model (e.g. VT-LFP-100)"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              required
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-volt-500 focus:ring-volt-500"
            />
            <input
              type="text"
              placeholder="Serial Number"
              value={form.serialNumber}
              onChange={(e) =>
                setForm({ ...form, serialNumber: e.target.value })
              }
              required
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-volt-500 focus:ring-volt-500"
            />
            <input
              type="number"
              placeholder="Capacity (Wh)"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              required
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-volt-500 focus:ring-volt-500"
            />
            <input
              type="text"
              placeholder="Chemistry (e.g. LFP, NMC)"
              value={form.chemistry}
              onChange={(e) => setForm({ ...form, chemistry: e.target.value })}
              required
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-volt-500 focus:ring-volt-500"
            />
            <div className="col-span-2 flex items-center gap-4">
              <button
                type="submit"
                disabled={
                  txState === "uploading" ||
                  txState === "pending" ||
                  txState === "confirming"
                }
                className="px-6 py-2 bg-volt-600 hover:bg-volt-700 text-white font-medium rounded-lg transition disabled:opacity-50"
              >
                {txState === "uploading"
                  ? "Uploading to IPFS..."
                  : txState === "pending"
                  ? "Sign in MetaMask..."
                  : txState === "confirming"
                  ? "Confirming..."
                  : txState === "done"
                  ? "✓ Created!"
                  : "Create Passport"}
              </button>
              {txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  className="text-xs text-volt-400 hover:underline"
                >
                  View on Etherscan ↗
                </a>
              )}
              {txError && <p className="text-red-400 text-xs">{txError}</p>}
            </div>
          </form>
        </div>
      )}

      {/* Passport Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">
          Loading passports...
        </div>
      ) : passports.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">No passports yet</p>
          <p className="text-gray-600 text-sm mt-2">
            Connect as ASSEMBLER to create the first battery passport
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {passports.map((p) => (
            <a
              key={p.tokenId}
              href={`/passport/${p.tokenId}`}
              className="block p-5 bg-gray-900 border border-gray-800 rounded-xl hover:border-volt-600/50 transition group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold group-hover:text-volt-400 transition">
                    #{p.tokenId} — {p.model}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    {p.serialNumber}
                  </p>
                </div>
                {p.stolen && (
                  <span className="px-2 py-0.5 text-xs bg-red-600/20 text-red-400 rounded-full border border-red-600/30">
                    STOLEN
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-400 mb-3">
                {p.capacity} Wh · {p.chemistry}
              </div>
              <StageBar current={p.stageIndex} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
