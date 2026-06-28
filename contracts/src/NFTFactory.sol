// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BasemintERC721} from "./BasemintERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title NFTFactory
/// @notice Deploys BasemintERC721 collections with a configurable treasury fee.
contract NFTFactory is Ownable, ReentrancyGuard {
    address public treasury;
    uint256 public creationFee;
    uint96 public defaultMintBps; // protocol mint-fee bps applied to each collection

    event CollectionCreated(
        address indexed creator,
        address indexed collection,
        string name,
        string symbol,
        uint256 maxSupply,
        uint256 mintPrice
    );
    event TreasuryUpdated(address treasury);
    event CreationFeeUpdated(uint256 fee);
    event DefaultMintBpsUpdated(uint96 bps);

    constructor(address owner_, address treasury_, uint256 creationFee_, uint96 defaultMintBps_)
        Ownable(owner_)
    {
        require(owner_ != address(0) && treasury_ != address(0), "addr=0");
        require(defaultMintBps_ <= 10_000, "bps>100%");
        treasury = treasury_;
        creationFee = creationFee_;
        defaultMintBps = defaultMintBps_;
    }

    function createCollection(
        string calldata name_,
        string calldata symbol_,
        string calldata baseURI_,
        uint256 maxSupply_,
        uint256 mintPrice_
    ) external payable nonReentrant returns (address collection) {
        require(msg.value >= creationFee, "fee");
        if (msg.value > 0) {
            (bool ok, ) = treasury.call{value: msg.value}("");
            require(ok, "treasury xfer");
        }
        BasemintERC721 c = new BasemintERC721(
            name_,
            symbol_,
            baseURI_,
            maxSupply_,
            mintPrice_,
            msg.sender,
            treasury,
            defaultMintBps
        );
        collection = address(c);
        emit CollectionCreated(msg.sender, collection, name_, symbol_, maxSupply_, mintPrice_);
    }

    function setTreasury(address treasury_) external onlyOwner {
        require(treasury_ != address(0), "addr=0");
        treasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    function setCreationFee(uint256 fee) external onlyOwner {
        creationFee = fee;
        emit CreationFeeUpdated(fee);
    }

    function setDefaultMintBps(uint96 bps) external onlyOwner {
        require(bps <= 10_000, "bps>100%");
        defaultMintBps = bps;
        emit DefaultMintBpsUpdated(bps);
    }
}
