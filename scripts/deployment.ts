import { ethers } from "hardhat";

export async function main(_privateKey) {
  const wallet = new ethers.Wallet(_privateKey, ethers.provider); 
  const deployFactory = await ethers.getContractFactory("Deployment"); 
  const deployContract = await deployFactory.connect(wallet).deploy();
  console.log('Waiting for NameContract deployment... ', deployContract.address);
  await deployContract.deployed();
} 
