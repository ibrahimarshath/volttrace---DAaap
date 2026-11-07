"use client";

import { useState, useEffect } from "react";
import { connectWallet } from "@/lib/wallet";
import { getRoles } from "@/lib/api";

interface WalletState {
  address: string;
  roles: string[];
  signer: any;
}

export default function WalletButton({
  onConnect,
}: {
  onConnect?: (state: WalletState) => void;
}) {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConnect() {
    setLoading(true);
    setError("");
    try {
      const { address, signer } = await connectWallet();
      const { roles } = await getRoles(address);
      const state = { address, roles, signer };
      setWallet(state);
      onConnect?.(state);
    } catch (err: any) {
      setError(err.message || "Connection failed");
    } finally {
      setLoading(false);
    }
  }

  // Listen for account changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handler = () => {
        setWallet(null);
      };
      window.ethereum.on("accountsChanged", handler);
      window.ethereum.on("chainChanged", handler);
      return () => {
        window.ethereum?.removeListener("accountsChanged", handler);
        window.ethereum?.removeListener("chainChanged", handler);
      };
    }
  }, []);

  if (wallet) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-sm">
          <div className="font-mono text-xs text-gray-400">
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </div>
          {wallet.roles.length > 0 && (
            <div className="flex gap-1 mt-1">
              {wallet.roles.map((r) => (
                <span
                  key={r}
                  className="px-2 py-0.5 text-xs rounded-full bg-volt-600/20 text-volt-400 border border-volt-600/30"
                >
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setWallet(null)}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="px-4 py-2 bg-volt-600 hover:bg-volt-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
      >
        {loading ? "Connecting..." : "Connect Wallet"}
      </button>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
