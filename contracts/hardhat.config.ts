import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    blockdag: {
      url: process.env.RPC_URL!,
      chainId: Number(process.env.CHAIN_ID ?? 991),
      accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
    },
  },
};
export default config;
