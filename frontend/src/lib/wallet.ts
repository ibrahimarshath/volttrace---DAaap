"use client";

import { BrowserProvider, JsonRpcSigner } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export async function connectWallet(): Promise<{
  address: string;
  signer: JsonRpcSigner;
  provider: BrowserProvider;
}> {
  if (!window.ethereum) {
    throw new Error("MetaMask not found. Please install MetaMask.");
  }

  const provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);

  // Ensure Sepolia network (chainId 11155111)
  const network = await provider.getNetwork();
  if (network.chainId !== 11155111n) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }],
      });
    } catch (err: any) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0xaa36a7",
              chainName: "Sepolia Testnet",
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
      } else {
        throw err;
      }
    }
    // Re-create provider after network switch
    const newProvider = new BrowserProvider(window.ethereum);
    const signer = await newProvider.getSigner();
    return { address: await signer.getAddress(), signer, provider: newProvider };
  }

  const signer = await provider.getSigner();
  return { address: await signer.getAddress(), signer, provider };
}
