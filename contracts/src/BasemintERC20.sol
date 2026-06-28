// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title BasemintERC20
/// @notice Production ERC20 with owner controls, pausable emergency stop, and reentrancy protection.
contract BasemintERC20 is ERC20, ERC20Burnable, ERC20Pausable, Ownable, ReentrancyGuard {
    uint8 private immutable _decimals;

    event EmergencyPaused(address indexed by);
    event EmergencyUnpaused(address indexed by);

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply,
        address owner_
    ) ERC20(name_, symbol_) Ownable(owner_) {
        require(owner_ != address(0), "owner=0");
        _decimals = decimals_;
        if (initialSupply > 0) {
            _mint(owner_, initialSupply);
        }
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external onlyOwner nonReentrant {
        _mint(to, amount);
    }

    function pause() external onlyOwner {
        _pause();
        emit EmergencyPaused(msg.sender);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit EmergencyUnpaused(msg.sender);
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
