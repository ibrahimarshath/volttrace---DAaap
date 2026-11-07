"use client";

import { useState, useEffect, use } from "react";
import { getPassport, uploadToIPFS } from "@/lib/api";
import { connectWallet } from "@/lib/wallet";
import { getWriteContract } from "@/lib/contract";
import { keccak256, toUtf8Bytes } from "ethers";
import StageBar from "@/components/StageBar";
import WalletButton from "@/components/WalletButton";

export default function PassportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tokenId = parseInt(id);

  const [passport, setPassport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wallet, setWallet] = useState<any>(null);

  // Action states
  const [actionState, setActionState] = useState<"idle" | "pending" | "confirming" | "done" | "error">("idle");
  const [actionMsg, setActionMsg] = useState("");
  const [actionTx, setActionTx] = useState("");

  // IPFS upload
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("");
  const [uploading, setUploading] = useState(false);

  async function load() {
    try {
      const data = await getPassport(tokenId);
      setPassport(data);
    } catch (err: any) {
      setError(`Passport #${tokenId} not found`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [tokenId]);

  async function doAction(action: string) {
    if (!wallet?.signer) {
      alert("Connect wallet first");
      return;
    }

    setActionState("pending");
    setActionMsg("");
    setActionTx("");

    try {
      const contract = getWriteContract(wallet.signer);
      let tx;

      switch (action) {
        case "transfer": {
          const toAddr = prompt("Enter recipient address:");
          if (!toAddr) { setActionState("idle"); return; }
          tx = await contract.transferFrom(wallet.address, toAddr, tokenId);
          break;
        }
        case "flagStolen":
          tx = await contract.flagStolen(tokenId);
          break;
        case "close":
          if (!confirm("Close this passport permanently?")) { setActionState("idle"); return; }
          tx = await contract.closePassport(tokenId);
          break;
        default:
          return;
      }

      setActionTx(tx.hash);
      setActionState("confirming");
      await tx.wait();
      setActionState("done");
      setActionMsg(`${action} successful!`);
      setTimeout(() => {
        load();
        setActionState("idle");
      }, 2000);
    } catch (err: any) {
      setActionState("error");
      setActionMsg(err.reason || err.message || "Transaction failed");
    }
  }

  async function handleAddDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet?.signer || !file || !docType) return;

    setUploading(true);
    setActionMsg("");

    try {
      // 1. Upload file to IPFS
      const ipfs = await uploadToIPFS(file);

      // 2. Hash the CID to get bytes32 docHash
      const docHash = keccak256(toUtf8Bytes(ipfs.cid));

      // 3. Call addDocument(tokenId, docHash, ipfsUri) on-chain
      const contract = getWriteContract(wallet.signer);
      setActionState("pending");
      const tx = await contract.addDocument(tokenId, docHash, ipfs.uri);
      setActionTx(tx.hash);
      setActionState("confirming");
      await tx.wait();
      setActionState("done");
      setActionMsg("Document added!");
      setFile(null);
      setDocType("");
      setTimeout(() => {
        load();
        setActionState("idle");
      }, 2000);
    } catch (err: any) {
      setActionState("error");
      setActionMsg(err.reason || err.message || "Failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;
  if (error) return <div className="text-center py-20 text-red-400">{error}</div>;
  if (!passport) return null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <a href="/" className="text-sm text-gray-500 hover:text-gray-300 mb-2 inline-block">
            ← Back to Dashboard
          </a>
          <h1 className="text-3xl font-bold">
            #{passport.tokenId} — {passport.model || passport.batteryId}
          </h1>
          <p className="text-gray-500 font-mono text-sm mt-1">{passport.serialNumber || passport.batteryId}</p>
        </div>
        <WalletButton onConnect={setWallet} />
      </div>

      {/* Stage */}
      <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl mb-6">
        <h2 className="text-sm text-gray-400 mb-3">Lifecycle Stage</h2>
        <StageBar current={passport.stageIndex} />
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
          <p className="text-xs text-gray-500">Capacity</p>
          <p className="font-semibold">{passport.capacity} Wh</p>
        </div>
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
          <p className="text-xs text-gray-500">Chemistry</p>
          <p className="font-semibold">{passport.chemistry}</p>
        </div>
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
          <p className="text-xs text-gray-500">Assembler</p>
          <p className="font-mono text-xs text-gray-300 break-all">{passport.assembler || "—"}</p>
        </div>
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
          <p className="text-xs text-gray-500">Current Owner</p>
          <p className="font-mono text-xs text-gray-300 break-all">{passport.currentOwner}</p>
        </div>
      </div>

      {/* Stolen badge */}
      {passport.stolen && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-600/30 rounded-xl text-red-400 text-center font-semibold">
          ⚠ This battery pack has been flagged as STOLEN
        </div>
      )}

      {/* Actions */}
      <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl mb-6">
        <h2 className="text-sm text-gray-400 mb-3">Actions</h2>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => doAction("transfer")}
            disabled={actionState === "pending" || actionState === "confirming"}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            Transfer
          </button>
          <button
            onClick={() => doAction("flagStolen")}
            disabled={actionState === "pending" || actionState === "confirming"}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            Flag Stolen
          </button>
          <button
            onClick={() => doAction("close")}
            disabled={actionState === "pending" || actionState === "confirming"}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            Close Passport
          </button>
        </div>
        {actionTx && (
          <a
            href={`https://sepolia.etherscan.io/tx/${actionTx}`}
            target="_blank"
            className="text-xs text-volt-400 hover:underline mt-2 inline-block"
          >
            View tx on Etherscan ↗
          </a>
        )}
        {actionMsg && (
          <p className={`text-sm mt-2 ${actionState === "error" ? "text-red-400" : "text-green-400"}`}>
            {actionMsg}
          </p>
        )}
      </div>

      {/* Documents */}
      <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
        <h2 className="text-sm text-gray-400 mb-3">
          Documents ({passport.documents?.length || 0})
        </h2>
        {passport.documents?.length > 0 ? (
          <ul className="space-y-2 mb-4">
            {passport.documents.map((doc: any, i: number) => (
              <li key={i} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm font-mono">{doc.docHash?.slice(0, 18)}...</p>
                  <p className="text-xs text-gray-500">by {doc.addedBy?.slice(0, 10)}...</p>
                </div>
                <a
                  href={doc.uri?.startsWith("ipfs://") ? `https://gateway.pinata.cloud/ipfs/${doc.uri.slice(7)}` : doc.uri}
                  target="_blank"
                  className="text-xs text-volt-400 hover:underline"
                >
                  View on IPFS ↗
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 text-sm mb-4">No documents attached yet</p>
        )}

        <hr className="border-gray-800 mb-4" />
        <h3 className="text-sm font-semibold mb-3">Add Document (IPFS)</h3>
        <form onSubmit={handleAddDocument} className="flex items-end gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">File</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Document Type</label>
            <input
              type="text"
              placeholder="e.g. test_report"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-volt-500 focus:ring-volt-500"
            />
          </div>
          <button
            type="submit"
            disabled={!file || !docType || uploading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload & Add"}
          </button>
        </form>
      </div>
    </div>
  );
}
