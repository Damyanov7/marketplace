//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Marketplace is Ownable, ReentrancyGuard  {
    uint private fees;
    uint public constant feePercentage = 5;
    uint public itemCount;
    uint public collectionCount;

    struct Item {
        address contractAddress;
        address owner;
        uint tokenId;
        uint price;
        bool forSale;
    }

    event CollectionAdded(address contractAddress);
    event ItemAdded(uint token, address contractAddress, uint tokenId);
    event ItemListedForSell(uint itemId, address contractAddress, uint tokenId, uint price);
    event ItemSold(uint itemId, address contractAddress, uint tokenId, uint price, address buyer);
    event OfferSent(uint itemId, address buyer, uint price);

    mapping(uint => Item) public item;
    mapping(uint => address) public collection;
    mapping(address => bool) public collectionExists;
    mapping(bytes32 => bool) public tokenExists;

    modifier itemExists(uint _itemId) {
        require(_itemId <= itemCount, "Item doesn't exist");
        _;
    }

    function withdrawFees() external onlyOwner {
        payable(this.owner()).transfer(fees);
        fees = 0;
    }

    function addCollection(address _contractAddress) external {
        require(!collectionExists[_contractAddress], "Collection already exists");

        collectionCount++;
        collection[collectionCount] = _contractAddress;
        collectionExists[_contractAddress] = true;

        emit CollectionAdded(_contractAddress);
    }

    function addItem(address _contractAddress, uint _tokenId) external {
        require(collectionExists[_contractAddress], "Collection does't exist");
        address owner = ERC721(_contractAddress).ownerOf(_tokenId);
        require(owner == msg.sender, "Sender doesn't own this item");
        bytes32 key = keccak256(abi.encodePacked(_contractAddress, _tokenId));
        require(!tokenExists[key], "Item exists");

        tokenExists[key] = true;
        itemCount++;
        item[itemCount] = Item(_contractAddress, msg.sender, _tokenId, 0, false);

        emit ItemAdded(itemCount, _contractAddress, _tokenId);
    }
    
    function sellItem(uint _itemId, uint _price) external itemExists(_itemId) { 
        address owner = ERC721(item[_itemId].contractAddress).ownerOf(item[_itemId].tokenId);
        require(owner == msg.sender, "Sender doesn't own this item");
        require(!item[_itemId].forSale, "Item is already for sale");
        require(_price > 0, "Item price must be bigger than 0");

        item[_itemId].price = _price;
        item[_itemId].forSale = true;

        emit ItemListedForSell(_itemId, item[_itemId].contractAddress, item[_itemId].tokenId, _price);
    }

    function buyItem(uint _itemId) external payable nonReentrant itemExists(_itemId) {
        require(item[_itemId].forSale, "Item is not for sale");
        require(msg.value >= item[_itemId].price, "Not enough ETH to buy this item");
        require(!(msg.sender == item[_itemId].owner), "You cannot buy your own item");

        uint fee = item[_itemId].price / 100 * feePercentage;
        payable(item[_itemId].owner).transfer(item[_itemId].price - fee);
        fees += fee;

        ERC721(item[_itemId].contractAddress).safeTransferFrom(item[_itemId].owner, msg.sender, item[_itemId].tokenId);

        item[_itemId].owner = msg.sender;
        item[_itemId].forSale = false;

        ItemSold(_itemId, item[_itemId].contractAddress, item[_itemId].tokenId, item[_itemId].price, item[_itemId].owner);
    }

    mapping(uint => mapping(address => uint)) public itemIdToAddressToOffer; // Tracks how much eth was sent to specific itemId as offer
    mapping(uint => mapping(address => bool)) public isActiveOffer;
    mapping(uint => mapping (uint => address)) public itemIdToOfferIdtoAddress;
    mapping(uint => uint) public itemOfferCount;

    function makeOffer(uint _itemId) external payable itemExists(_itemId) {
        require(msg.sender != item[_itemId].owner, "You cannot send offers to your self");
        require(msg.value > 0, "Ether amount sent must be higher than 0");
        require(!isActiveOffer[_itemId][msg.sender], "Already has active offer");

        itemIdToAddressToOffer[_itemId][msg.sender] = msg.value;    
        itemOfferCount[_itemId]++;          // Increase the amount of offers for the item
        isActiveOffer[_itemId][msg.sender] = true;   // Add the address to the mapping that checks if it sending for the first time
        itemIdToOfferIdtoAddress[_itemId][itemOfferCount[_itemId]] = msg.sender;  

        OfferSent(_itemId, msg.sender, msg.value);
    }
    
    function acceptOffer(uint _itemId, uint _offerId) external payable itemExists(_itemId) nonReentrant {
        require(msg.sender == item[_itemId].owner, "You are not owner of the item");  
        require(_offerId <= itemOfferCount[_itemId], "Invalid offer id");
                
        address buyer = itemIdToOfferIdtoAddress[_itemId][itemOfferCount[_offerId]];
        uint itemPrice = itemIdToAddressToOffer[_itemId][buyer];
        uint fee = itemPrice / 100 * feePercentage;
        payable(msg.sender).transfer(itemPrice - fee);
        fees += fee;

        ERC721(item[_itemId].contractAddress).safeTransferFrom(msg.sender, buyer, item[_itemId].tokenId);
        item[_itemId].forSale = false;
        item[_itemId].owner = buyer;
        isActiveOffer[_itemId][buyer] = false;
        itemIdToOfferIdtoAddress[_itemId][itemOfferCount[_offerId]] = itemIdToOfferIdtoAddress[_itemId][itemOfferCount[_itemId]];
        itemOfferCount[_itemId]--;
        
        ItemSold(_itemId, item[_itemId].contractAddress, item[_itemId].tokenId, item[_itemId].price, item[_itemId].owner);
    }

    function revertOffer(uint _itemId, uint _offerId) external itemExists(_itemId) {
        require(isActiveOffer[_itemId][msg.sender], "There must be an existing offer in order to revert it");

        address payable to = payable(msg.sender);
        isActiveOffer[_itemId][msg.sender] = false;                                                             // remove offer bool
        to.transfer(itemIdToAddressToOffer[_itemId][msg.sender]);                                               // transfer the amount that was in the offer
        itemIdToAddressToOffer[_itemId][msg.sender] = 0;                                                        // set the amount to zero
        itemIdToOfferIdtoAddress[_itemId][itemOfferCount[_offerId]] = itemIdToOfferIdtoAddress[_itemId][itemOfferCount[_itemId]];   // remove the offer from the iterator
        itemOfferCount[_itemId]--;
    }
}