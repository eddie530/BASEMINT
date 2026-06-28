// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BasemintERC20} from "./BasemintERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TokenFactory
/// @notice Deploys BasemintERC20 instances and forwards a protocol fee to treasury.
contract TokenFactory is Ownable, ReentrancyGuard {
    address public treasury;
    uint256 public creationFee;

    event TokenCreated(
        address indexed creator,
        address indexed token,
        string name,
        string symbol,
        uint256 initialSupply
    );
    event TreasuryUpdated(address treasury);
    event CreationFeeUpdated(uint256 fee);

    constructor(address owner_, address treasury_, uint256 creationFee_) Ownable(owner_) {
        require(owner_ != address(0) && treasury_ != address(0), "addr=0");
        treasury = treasury_;
        creationFee = creationFee_;
    }

    function createToken(
        string calldata name_,
        string calldata symbol_,
        uint8 decimals_,
        uint256 initialSupply
    ) external payable nonReentrant returns (address token) {
        require(msg.value >= creationFee, "fee");
        if (msg.value > 0) {
            (bool ok, ) = treasury.call{value: msg.value}("");
            require(ok, "treasury xfer");
        }
        BasemintERC20 t = new BasemintERC20(name_, symbol_, decimals_, initialSupply, msg.sender);
        token = address(t);
        emit TokenCreated(msg.sender, token, name_, symbol_, initialSupply);
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
}
