// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Pausable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title BasemintERC721
/// @notice Production ERC721 with paid mint, owner controls, pausable, reentrancy guard,
///         and treasury fee split.
contract BasemintERC721 is ERC721, ERC721Pausable, Ownable, ReentrancyGuard {
    using Strings for uint256;

    uint256 public immutable maxSupply;
    uint256 public mintPrice;
    address public treasury;
    uint96 public treasuryBps; // protocol fee in basis points, e.g. 500 = 5%

    uint256 public totalMinted;
    string public baseTokenURI;

    event Minted(address indexed to, uint256 indexed tokenId, uint256 pricePaid);
    event TreasuryUpdated(address indexed treasury, uint96 bps);
    event MintPriceUpdated(uint256 price);
    event BaseURIUpdated(string baseURI);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        uint256 maxSupply_,
        uint256 mintPrice_,
        address owner_,
        address treasury_,
        uint96 treasuryBps_
    ) ERC721(name_, symbol_) Ownable(owner_) {
        require(owner_ != address(0) && treasury_ != address(0), "addr=0");
        require(treasuryBps_ <= 10_000, "bps>100%");
        maxSupply = maxSupply_;
        mintPrice = mintPrice_;
        baseTokenURI = baseURI_;
        treasury = treasury_;
        treasuryBps = treasuryBps_;
    }

    function mint(address to, uint256 quantity) external payable nonReentrant whenNotPaused {
        require(quantity > 0, "qty=0");
        require(maxSupply == 0 || totalMinted + quantity <= maxSupply, "sold out");
        require(msg.value >= mintPrice * quantity, "underpaid");

        uint256 fee = (msg.value * treasuryBps) / 10_000;
        if (fee > 0) {
            (bool ok, ) = treasury.call{value: fee}("");
            require(ok, "treasury xfer");
        }
        uint256 remainder = msg.value - fee;
        if (remainder > 0) {
            (bool ok2, ) = owner().call{value: remainder}("");
            require(ok2, "owner xfer");
        }

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = ++totalMinted;
            _safeMint(to, tokenId);
            emit Minted(to, tokenId, mintPrice);
        }
    }

    function setMintPrice(uint256 price) external onlyOwner {
        mintPrice = price;
        emit MintPriceUpdated(price);
    }

    function setTreasury(address treasury_, uint96 bps_) external onlyOwner {
        require(treasury_ != address(0), "addr=0");
        require(bps_ <= 10_000, "bps>100%");
        treasury = treasury_;
        treasuryBps = bps_;
        emit TreasuryUpdated(treasury_, bps_);
    }

    function setBaseURI(string calldata baseURI_) external onlyOwner {
        baseTokenURI = baseURI_;
        emit BaseURIUpdated(baseURI_);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Pausable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }
}
