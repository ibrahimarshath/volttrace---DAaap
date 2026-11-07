import os
from dotenv import load_dotenv

load_dotenv()

RPC_URL = os.getenv("RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "0x5288C0C8c67ea5E3Be693e4F42CfA4210515e44e")
PINATA_JWT = os.getenv("PINATA_JWT", "")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
