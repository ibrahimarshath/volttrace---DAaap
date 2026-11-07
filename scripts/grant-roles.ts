import hre from "hardhat";
import { Contract, Wallet, JsonRpcProvider, keccak256, toUtf8Bytes } from "ethers";

const CONTRACT = "0x5288C0C8c67ea5E3Be693e4F42CfA4210515e44e";
const ABI = [
  "function grantRole(bytes32 role, address account) external",
  "function hasRole(bytes32 role, address account) view returns (bool)",
];

async function main() {
  const connection = await hre.network.getOrCreate();
  
  // Get the signer from Hardhat's provider
  const provider = new JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  
  // Request private key from Hardhat's connection
  const accounts = await connection.provider.request({ method: "eth_accounts" });
  const adminAddr = accounts[0] as string;
  console.log("Admin:", adminAddr);

  // Use Hardhat's provider directly as a signer proxy
  const contract = new Contract(CONTRACT, ABI, {
    provider,
    sendTransaction: async (tx: any) => {
      const txHash = await connection.provider.request({
        method: "eth_sendTransaction",
        params: [{ from: adminAddr, to: tx.to, data: tx.data }],
      }) as string;
      return await provider.getTransaction(txHash);
    },
    getAddress: async () => adminAddr,
  } as any);

  const roles = [
    { name: "ASSEMBLER_ROLE", address: "0xD70Ee45C78E8cA48aE16e8C873D0793C9cd30b99" },
    { name: "OEM_ROLE",       address: "0x8F2f93a4BB7a5E8a8cA905C3c50b613E08e48760" },
    { name: "OWNER_ROLE",     address: "0x6405EF63F74EF5303540DA59F40BD1b987C412c1" },
    { name: "RECYCLER_ROLE",  address: "0x358A2F95764472bE86C3fF3791C64CC4f25978b3" },
    { name: "REGULATOR_ROLE", address: "0xe70F59FcA123773958c31FF1C908E742358309A3" },
  ];

  for (const role of roles) {
    const roleHash = keccak256(toUtf8Bytes(role.name));
    
    // Check if already granted
    const has = await new Contract(CONTRACT, ABI, provider).hasRole(roleHash, role.address);
    if (has) {
      console.log(`${role.name} → ${role.address} (already granted, skipping)`);
      continue;
    }

    console.log(`Granting ${role.name} to ${role.address}...`);
    const data = contract.interface.encodeFunctionData("grantRole", [roleHash, role.address]);
    
    const txHash = await connection.provider.request({
      method: "eth_sendTransaction",
      params: [{ from: adminAddr, to: CONTRACT, data }],
    }) as string;
    
    console.log(`  tx: ${txHash}`);
    console.log(`  waiting for confirmation...`);
    await provider.waitForTransaction(txHash);
    console.log(`  ✓ confirmed`);
  }

  console.log("\nAll roles granted!");
}

main().catch(console.error);