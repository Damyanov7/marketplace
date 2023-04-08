//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./NFT.sol";

contract Deployment{
    address public lastDeployedContract;
 
    function createToken(string memory tokenName, string memory tokenSymbol) public {
        lastDeployedContract = address(new NFT(tokenName, tokenSymbol));
        NFT(lastDeployedContract).transferOwnership(msg.sender); 
    }
}