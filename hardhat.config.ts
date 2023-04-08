import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const lazyImport = async (module: any) => {
    return (await import(module));
};

task("deploy-marketplace", "Deploys marketplace")
.addParam("privateKey", "Please provide the private key")
.setAction(async ({ privateKey }) => {
    const { main } = await lazyImport("./scripts/deploy-marketplace");
    await main(privateKey);
});

task("deploy-deployment", "Deploys deployment contract")
.addParam("privateKey", "Please provide the private key")
.setAction(async ({ privateKey }) => {
    const { main } = await lazyImport("./scripts/deployment");
    await main(privateKey);
});

const config: HardhatUserConfig = {
  solidity: "0.8.1",
};

module.exports = {
  solidity: {
    version: "0.8.1",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Goerli Testnet
    // goerli: {
    //   url: `https://goerli.infura.io/v3/a68b1888eded486f9b656e08f5db1610`,
    //   chainId: 5,
    //   accounts: [
    //     `32eb75bddc05680c9b134e112f03795bfac04c215f942b52e853ca24447b7a0f`,
    //   ],
    // },
    // Sepolia testnet
    Sepolia: {
      url: `https://sepolia.infura.io/v3/a68b1888eded486f9b656e08f5db1610`,
      accounts: [
        `944c4a11c7145acdf6950781f98e2ec4d8c530ced13e1c503035c73e33d5e91a`,
      ],
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at <https://etherscan.io/>
    apiKey: "CHIRAADNUI814XIT9ST36R63UFNBNDKBDY"
  }
};

export default config;
