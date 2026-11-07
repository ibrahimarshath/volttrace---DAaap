"use client";

import { useState } from "react";
import { getPassport } from "@/lib/api";
import StageBar from "@/components/StageBar";

export default function LookupPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const tokenId = parseInt(query);
    if (isNaN(tokenId) || tokenId < 0) {
      setError("Enter a valid passport ID (number)");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await getPassport(tokenId);
      setResult(data);
    } catch (err: any) {
      setError(`Passport #${tokenId} not found`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Passport Lookup</h1>
      <p className="text-gray-400 mb-8">
        Search for any battery passport by its token ID
      </p>

      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <input
          type="text"
          placeholder="Enter passport ID (e.g. 0)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:border-volt-500 focus:ring-volt-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-volt-600 hover:bg-volt-700 text-white font-medium rounded-lg transition disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">
                #{result.tokenId} — {result.model}
              </h2>
              <p className="text-sm text-gray-500 font-mono">{result.serialNumber}</p>
            </div>
            {result.stolen && (
              <span className="px-3 py-1 text-sm bg-red-600/20 text-red-400 rounded-full border border-red-600/30 font-medium">
                ⚠ STOLEN
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <span className="text-gray-500">Capacity</span>
              <p className="font-medium">{result.capacity} Wh</p>
            </div>
            <div>
              <span className="text-gray-500">Chemistry</span>
              <p className="font-medium">{result.chemistry}</p>
            </div>
            <div>
              <span className="text-gray-500">Assembler</span>
              <p className="font-mono text-xs text-gray-300">{result.assembler}</p>
            </div>
            <div>
              <span className="text-gray-500">Current Owner</span>
              <p className="font-mono text-xs text-gray-300">{result.currentOwner}</p>
            </div>
          </div>

          <div className="mb-6">
            <span className="text-gray-500 text-sm">Lifecycle Stage</span>
            <div className="mt-2">
              <StageBar current={result.stageIndex} />
            </div>
          </div>

          {/* Documents */}
          {result.documents && result.documents.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">
                Documents ({result.documents.length})
              </h3>
              <div className="space-y-2">
                {result.documents.map((doc: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg text-sm"
                  >
                    <div>
                      <span className="font-medium">{doc.docType}</span>
                      <span className="text-gray-500 ml-2">
                        {new Date(doc.timestamp * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${doc.ipfsHash}`}
                      target="_blank"
                      className="text-volt-400 hover:underline text-xs"
                    >
                      View on IPFS ↗
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-800">
            <a
              href={`/passport/${result.tokenId}`}
              className="text-volt-400 hover:underline text-sm"
            >
              View full passport page →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
