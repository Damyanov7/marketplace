import { NFT } from "./../typechain-types/contracts/NFT";
import { Marketplace } from "./../typechain-types/contracts/Marketplace";
import { Deployment } from "./../typechain-types/contracts/Deployment";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Library", function () {
    let NFTFactory;
    let MarketplaceFactory;
    let DeploymentFactory;
    let NFTItem: NFT;
    let Marketplace: Marketplace;
    let Deployment: Deployment;
    let owner, addr1, addr2, addr3;

    before(async () => {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();

        NFTFactory = await ethers.getContractFactory("NFT");
        MarketplaceFactory = await ethers.getContractFactory("Marketplace");
        DeploymentFactory = await ethers.getContractFactory("Deployment");

        NFTItem = await NFTFactory.deploy("tokenName", "tokenSymbol");
        await NFTItem.deployed();

        Marketplace = await MarketplaceFactory.deploy();
        await Marketplace.deployed();

        Deployment = await DeploymentFactory.deploy();
        await Deployment.deployed();
    });

    it("Deploys an NFT contract using deployment contract", async function () {
        expect(await Deployment.createToken("tokenName", "tokenSymbol")).to.be.ok;
    });

    it("Should add collection to the marketplace", async function () {
        expect(await Marketplace.addCollection(NFTItem.address)).to.be.ok;
    });

    it("Should revert with collection already added", async function () {
        await expect(Marketplace.addCollection(NFTItem.address)).to.be.revertedWith("Collection already exists");
    });

    it("Should mint new item to the test collection (NFTItem)", async function () {
        expect(await NFTItem.safeMint("URI", owner.address)).to.be.ok;
    });

    it("Should add item to the marketplace", async function () {
        expect(await Marketplace.addItem(NFTItem.address, 1)).to.be.ok;
    });

    it("Should revert with item is already added", async function () {
        await expect(Marketplace.addItem(NFTItem.address, 1)).to.be.revertedWith("Item exists");
    });

    it("Should revert with sender doesn't own the item", async function () {
        await expect(Marketplace.connect(addr1).addItem(NFTItem.address, 1)).to.be.revertedWith("Sender doesn't own this item");
    });

    it("Should revert with collection doesn't exist", async function () {
        await expect(Marketplace.addItem(addr1.address, 1)).to.be.revertedWith("Collection does't exist");
    });

    it("Should revert to list item for sale with Item price must be bigger than 0", async function () {
        await expect(Marketplace.sellItem(1, 0)).to.be.revertedWith("Item price must be bigger than 0");
    });

    it("Should list item for sale", async function () {
        expect(await Marketplace.sellItem(1, 1)).to.be.ok;
    });

    it("Should revert to list item for sale with not owner of item", async function () {
        await expect(Marketplace.connect(addr1).sellItem(1, 1)).to.be.revertedWith("Sender doesn't own this item");
    });

    it("Should revert to list item for sale with Item is already for sale", async function () {
        await expect(Marketplace.sellItem(1, 1)).to.be.revertedWith("Item is already for sale");
    });

    it("Should revert with item doesn't exist", async function () {
        await expect(Marketplace.sellItem(2, 1)).to.be.revertedWith("Item doesn't exist");
    });

    //buyItem(uint _itemId)
    it("Should buy item", async function () {
        await NFTItem.setApprovalForAll(Marketplace.address, true);
        expect(await Marketplace.connect(addr1).buyItem(1, {value: 1})).to.be.ok;
    });

    it("Should revert with item doesn't exist", async function () {
        await expect(Marketplace.buyItem(2, {value: 1})).to.be.revertedWith("Item doesn't exist");
    });

    it("Should revert with You cannot buy your own item", async function () {
        expect(await Marketplace.connect(addr1).sellItem(1, 1)).to.be.ok;
        await expect(Marketplace.connect(addr1).buyItem(1, {value: 1})).to.be.revertedWith("You cannot buy your own item");
    });

    it("Should revert with Item is not for sale", async function () {
        await NFTItem.connect(addr1).setApprovalForAll(Marketplace.address, true);
        await expect(await Marketplace.buyItem(1, {value: 1})).to.be.ok;
        await expect(Marketplace.connect(addr1).buyItem(1, {value: 1})).to.be.revertedWith("Item is not for sale");
    });

    it("Should revert with Not enough ETH to buy this item", async function () {
        expect(await Marketplace.sellItem(1, 2)).to.be.ok;
        await expect(Marketplace.connect(addr1).buyItem(1, {value: 1})).to.be.revertedWith("Not enough ETH to buy this item");
    });

    // makeOffer(uint _itemId)
    it("Should revert with You cannot send offers to your self", async function () {
        await expect(Marketplace.makeOffer(1, {value: 3})).to.be.revertedWith("You cannot send offers to your self");
    });

    it("Should revert with Item doesn't exist", async function () {
        await expect(Marketplace.connect(addr1).makeOffer(2, {value: 0})).to.be.revertedWith("Item doesn't exist");
    });

    it("Should revert with Ether amount sent must be higher than 0", async function () {
        await expect(Marketplace.connect(addr1).makeOffer(1, {value: 0})).to.be.revertedWith("Ether amount sent must be higher than 0");
    });

    it("Should make an offer succesfully", async function () {
        await expect(Marketplace.connect(addr1).makeOffer(1, {value: 3})).to.be.ok;
    });

    it("Should revert with Already has active offer", async function () {
        await expect(Marketplace.connect(addr1).makeOffer(1, {value: 3})).to.be.ok;
    });

    //revertOffer(uint _itemId, uint _offerId)
    it("Should revert with Item doesn't exist", async function () {
        await expect(Marketplace.connect(addr1).revertOffer(2, 1)).to.be.revertedWith("Item doesn't exist");
    });

    it("Should revert with There must be an existing offer in order to revert it", async function () {
        await expect(Marketplace.connect(addr2).revertOffer(1, 1)).to.be.revertedWith("There must be an existing offer in order to revert it");
    });

    it("Should revert offer succesfully", async function () {
        await expect(Marketplace.connect(addr1).revertOffer(1, 1)).to.be.ok;
    });

    // acceptOffer(uint _itemId, uint _offerId)
    it("Should revert with You are not owner of the item", async function () {
        await expect(Marketplace.connect(addr1).makeOffer(1, {value: 3})).to.be.ok;
        await expect(Marketplace.connect(addr2).acceptOffer(1, 1)).to.be.revertedWith("You are not owner of the item");
    });
    
    it("Should revert with Invalid offer id", async function () {
        await expect(Marketplace.acceptOffer(1, 2)).to.be.revertedWith("Invalid offer id");
    });

    it("Should revert with Item doesn't exist", async function () {
        await expect(Marketplace.acceptOffer(2, 1)).to.be.revertedWith("Item doesn't exist");
    });

    it("Should accept offer succesfully", async function () {
        await expect(Marketplace.acceptOffer(1, 1)).to.be.ok;
    });

    it("Should withdrawl fees", async function () {
        await expect(Marketplace.withdrawFees()).to.be.ok;
    });

    it("Should revert with onlyOwner", async function () {
        await expect(Marketplace.connect(addr3).withdrawFees()).to.be.revertedWith("Ownable: caller is not the owner");
    });



    // it("Should revert with", async function () {
    // });

    // it("", async function () {
    // });


    // it("Should fail to add book", async function () {
    //     expect(Library.connect(addr1).addBooks("RandomTitle", 5)).to.be.revertedWith('Ownable: caller is not the owner');
    // });

    // for(let i = 1; i < 3; i++) 
    //     it("Should add book (RandomTitle) " + i, async function () {
    //         await Library.addBooks("RandomTitle", 1);
    //         expect(await Library.getNumberOfBooks()).to.equal(1);
    //         expect(await Library.books(Library.iterator(0))).to.eql([i, "RandomTitle"]);
    //     });

    // it("Should add new unique book", async function () {
    //     await Library.addBooks("RandomTitle2", 1);
    //     expect(await Library.getNumberOfBooks()).to.equal(2);
    //     expect(await Library.getBookDetails("RandomTitle2")).to.eql(["RandomTitle2", 1]);
    // });

    // it("Should borrow a book", async function () {
    //     expect(Library.borrowBook("RandomTitle")).to.ok;
    //     expect(await Library.isRented("RandomTitle")).to.equal(true);
    // });

    // it("Should revert with book does not exist", async function () {
    //     expect(Library.borrowBook("123")).to.be.revertedWith('Book does not exist');
    // });

    // // Functionality of currentBorrowers is covered in this test case
    // it("Should fail to borrow book", async function () {
    //     expect(Library.borrowBook("RandomTitle")).to.be.revertedWith("The sender has already borrowed this book");
    // });

    // it("Should revert with no available copies", async function () {
    //     await Library.connect(addr1).borrowBook("RandomTitle");
    //     expect(Library.connect(addr1).borrowBook("RandomTitle")).to.be.revertedWith("No copies");
    // });

    // it("Should revert with this book was never borrowed", async function () {
    //     expect(Library.returnBook("1234")).to.be.revertedWith('This book does not belong to the lib');
    // });

    // it("Should return borrowed book by owner", async function () {
    //     await Library.returnBook("RandomTitle");
    // });

    // it("Should revert with user hasn't borrowed this book", async function () {
    //     expect(Library.returnBook("RandomTitle")).to.be.revertedWith("User hasn't borrow this book");
    // });

    // it("Should revert with no such title", async function() {
    //     expect(Library.getBorrowingHistory("RandomTitle123")).to.be.revertedWith("No such title");
    //     expect(Library.isRented("RandomTitle123")).to.be.revertedWith("No such title");
    //     expect(Library.getBookDetails("RandomTitle123")).to.be.revertedWith("No such title");
    // });

    // // Checking if the addresses that were used when borrowing books are present in the borrowings history
    // it("Should get borrowing history", async function() {
    //     const a = await Library.getBorrowingHistory("RandomTitle");
    //     expect(a).to.eql([await owner.getAddress(), await addr1.getAddress()]);
    // });
});