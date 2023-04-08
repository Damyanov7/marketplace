import { ethers } from "hardhat";

export async function main(_privateKey) {
  const wallet = new ethers.Wallet(_privateKey, ethers.provider); 
  const MarketplaceFactory = await ethers.getContractFactory("Marketplace"); 
  const MarketplaceContract = await MarketplaceFactory.connect(wallet).deploy();
  console.log('Waiting for NameContract deployment... ', MarketplaceContract.address);
  await MarketplaceContract.deployed();
} 

