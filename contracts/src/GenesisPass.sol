// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Pausable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Resident Labs // GENESIS PASS
/// @notice Open-edition ERC721 with a fixed price, a configurable mint window,
///         a hard one-per-wallet cap, pausability, ERC-2981 royalties and
///         pull-based withdrawal to a treasury.
/// @dev There is no privileged mint path: the only way a token can be created is
///      `mint()`, which always charges `mintPrice`, always enforces the window
///      and always enforces the one-per-wallet cap — for the owner too.
contract GenesisPass is ERC721, ERC721Pausable, ERC2981, Ownable, ReentrancyGuard {
    /// @notice Price per pass, in wei. Immutable so it can never be raised or zeroed.
    uint256 public immutable mintPrice;
    /// @notice Unix timestamp the mint window opens (inclusive).
    uint64 public mintStart;
    /// @notice Unix timestamp the mint window closes (inclusive).
    uint64 public mintEnd;
    /// @notice Hard cap of passes per wallet. Immutable.
    uint256 public constant MAX_PER_WALLET = 1;

    /// @notice Number of passes minted so far. Open edition: no max supply.
    uint256 public totalMinted;
    /// @notice Passes minted per address, used for the one-per-wallet cap.
    mapping(address => uint256) public mintedBy;

    address public treasury;
    string public baseTokenURI;

    event Minted(address indexed to, uint256 indexed tokenId, uint256 pricePaid);
    event MintWindowUpdated(uint64 start, uint64 end);
    event TreasuryUpdated(address indexed treasury);
    event BaseURIUpdated(string baseURI);
    event Withdrawn(address indexed to, uint256 amount);

    error MintNotOpen();
    error MintClosed();
    error WalletLimitReached();
    error IncorrectPayment();
    error ZeroAddress();
    error InvalidWindow();
    error NothingToWithdraw();
    error WithdrawFailed();

    /// @param owner_ Contract owner (admin controls only, no mint privileges).
    /// @param treasury_ Address that receives withdrawn mint proceeds.
    /// @param mintPrice_ Price per pass in wei (0.0005 ether for GENESIS PASS).
    /// @param mintStart_ Window open timestamp.
    /// @param mintDuration_ Window length in seconds (7 days for GENESIS PASS).
    /// @param royaltyBps_ ERC-2981 royalty in basis points (500 = 5%).
    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        address owner_,
        address treasury_,
        uint256 mintPrice_,
        uint64 mintStart_,
        uint64 mintDuration_,
        uint96 royaltyBps_
    ) ERC721(name_, symbol_) Ownable(owner_) {
        if (owner_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        if (mintStart_ == 0 || mintDuration_ == 0) revert InvalidWindow();
        mintPrice = mintPrice_;
        mintStart = mintStart_;
        mintEnd = mintStart_ + mintDuration_;
        treasury = treasury_;
        baseTokenURI = baseURI_;
        _setDefaultRoyalty(treasury_, royaltyBps_);
        emit MintWindowUpdated(mintStart, mintEnd);
    }

    // ---------------------------------------------------------------- minting

    /// @notice Mint GENESIS PASS(es). `quantity` must be 1: the wallet cap is 1.
    /// @dev Signature kept ABI-compatible with the existing BaseMint frontend.
    function mint(address to, uint256 quantity) external payable nonReentrant whenNotPaused {
        if (to == address(0)) revert ZeroAddress();
        if (block.timestamp < mintStart) revert MintNotOpen();
        if (block.timestamp > mintEnd) revert MintClosed();
        if (quantity == 0 || mintedBy[to] + quantity > MAX_PER_WALLET) revert WalletLimitReached();
        if (msg.value != mintPrice * quantity) revert IncorrectPayment();

        mintedBy[to] += quantity;
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = ++totalMinted;
            _safeMint(to, tokenId);
            emit Minted(to, tokenId, mintPrice);
        }
    }

    /// @notice True when a wallet can still mint right now.
    function canMint(address account) external view returns (bool) {
        return
            !paused() &&
            block.timestamp >= mintStart &&
            block.timestamp <= mintEnd &&
            mintedBy[account] < MAX_PER_WALLET;
    }

    // ------------------------------------------------------------ owner admin

    function setMintWindow(uint64 start_, uint64 end_) external onlyOwner {
        if (start_ == 0 || end_ <= start_) revert InvalidWindow();
        mintStart = start_;
        mintEnd = end_;
        emit MintWindowUpdated(start_, end_);
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    function setDefaultRoyalty(address receiver, uint96 bps) external onlyOwner {
        if (receiver == address(0)) revert ZeroAddress();
        _setDefaultRoyalty(receiver, bps);
    }

    function setBaseURI(string calldata baseURI_) external onlyOwner {
        baseTokenURI = baseURI_;
        emit BaseURIUpdated(baseURI_);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Sends the full contract balance to `treasury`.
    function withdraw() external onlyOwner nonReentrant {
        uint256 amount = address(this).balance;
        if (amount == 0) revert NothingToWithdraw();
        address to = treasury;
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert WithdrawFailed();
        emit Withdrawn(to, amount);
    }

    // -------------------------------------------------------------- internals

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

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
