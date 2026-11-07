import { JsonRpcProvider, Contract, keccak256, toUtf8Bytes } from "ethers";

const RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const CONTRACT = "0x5288C0C8c67ea5E3Be693e4F42CfA4210515e44e";

const abi = [
  "function totalMinted() view returns (uint256)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
];

// Paste the addresses from your MetaMask accounts here
const ADDRESSES_TO_CHECK = [
  "0xE0d559b2eaa094e392B2d4287F7Cc765C60BbD53",
  "0xD70Ee45C78E8cA48aE16e8C873D0793C9cd30b99",
  "0x8F2f93a4BB7a5E8a8cA905C3c50b613E08e48760",
  "0x6405EF63F74EF5303540DA59F40BD1b987C412c1",
  "0x358A2F95764472bE86C3fF3791C64CC4f25978b3",
  "0xe70F59FcA123773958c31FF1C908E742358309A3",
];

async function main() {
  const provider = new JsonRpcProvider(RPC);
  const contract = new Contract(CONTRACT, abi, provider);

  const total = await contract.totalMinted();
  console.log("Total passports minted:", total.toString());

  const roles = [
    { name: "ADMIN", hash: "0x0000000000000000000000000000000000000000000000000000000000000000" },
    { name: "ASSEMBLER", hash: keccak256(toUtf8Bytes("ASSEMBLER_ROLE")) },
    { name: "OEM", hash: keccak256(toUtf8Bytes("OEM_ROLE")) },
    { name: "OWNER", hash: keccak256(toUtf8Bytes("OWNER_ROLE")) },
    { name: "RECYCLER", hash: keccak256(toUtf8Bytes("RECYCLER_ROLE")) },
    { name: "REGULATOR", hash: keccak256(toUtf8Bytes("REGULATOR_ROLE")) },
  ];

  if (ADDRESSES_TO_CHECK.length === 0) {
    console.log("\nNo addresses to check. Add your MetaMask addresses to the script.");
    console.log("Open MetaMask → click each account → copy address → paste in the script.");
    return;
  }

  console.log("\n--- Checking roles ---");
  for (const addr of ADDRESSES_TO_CHECK) {
    const found: string[] = [];
    for (const role of roles) {
      const has = await contract.hasRole(role.hash, addr);
      if (has) found.push(role.name);
    }
    console.log(`${addr}: ${found.length > 0 ? found.join(", ") : "no roles"}`);
  }
}

main().catch(console.error);
