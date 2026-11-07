"use client";

import { Contract, JsonRpcSigner } from "ethers";

const CONTRACT_ADDRESS = "0x5288C0C8c67ea5E3Be693e4F42CfA4210515e44e";

// Only write functions — reads go through the backend API
const WRITE_ABI = [
  "function createPassport(string batteryId, string uri) external returns (uint256)",
  "function transferFrom(address from, address to, uint256 tokenId) external",
  "function flagStolen(uint256 tokenId) external",
  "function closePassport(uint256 tokenId) external",
  "function addDocument(uint256 tokenId, bytes32 docHash, string uri) external",
];

export function getWriteContract(signer: JsonRpcSigner) {
  return new Contract(CONTRACT_ADDRESS, WRITE_ABI, signer);
}
