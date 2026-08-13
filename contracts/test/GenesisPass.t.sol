// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {GenesisPass} from "../src/GenesisPass.sol";

contract Reverter {
    receive() external payable {
        revert("no");
    }
}

contract GenesisPassTest is Test {
    GenesisPass pass;

    address owner = address(0xA11CE);
    address treasury = address(0xBEEF);
    address alice = address(0x1111);
    address bob = address(0x2222);

    uint256 constant PRICE = 0.0005 ether;
    uint64 constant DURATION = 7 days;
    uint64 start;

    function setUp() public {
        start = uint64(block.timestamp + 1 days);
        pass = new GenesisPass(
            "Resident Labs // GENESIS PASS",
            "GENESIS",
            "ipfs://base/",
            owner,
            treasury,
            PRICE,
            start,
            DURATION,
            500
        );
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);
    }

    function _open() internal {
        vm.warp(start + 1);
    }

    // ---------------------------------------------------------------- config

    function test_Config() public view {
        assertEq(pass.mintPrice(), PRICE);
        assertEq(pass.mintStart(), start);
        assertEq(pass.mintEnd(), start + DURATION);
        assertEq(pass.MAX_PER_WALLET(), 1);
        assertEq(pass.owner(), owner);
        assertEq(pass.treasury(), treasury);
        assertEq(pass.totalMinted(), 0);
    }

    // --------------------------------------------------------- price checks

    function test_MintAtExactPrice() public {
        _open();
        vm.prank(alice);
        pass.mint{value: PRICE}(alice, 1);
        assertEq(pass.balanceOf(alice), 1);
        assertEq(pass.ownerOf(1), alice);
        assertEq(pass.totalMinted(), 1);
        assertEq(address(pass).balance, PRICE);
    }

    function test_RevertWhen_Underpaid() public {
        _open();
        vm.prank(alice);
        vm.expectRevert(GenesisPass.IncorrectPayment.selector);
        pass.mint{value: PRICE - 1}(alice, 1);
    }

    function test_RevertWhen_Overpaid() public {
        _open();
        vm.prank(alice);
        vm.expectRevert(GenesisPass.IncorrectPayment.selector);
        pass.mint{value: PRICE + 1}(alice, 1);
    }

    // ------------------------------------------------------ one per wallet

    function test_RevertWhen_SecondMintSameWallet() public {
        _open();
        vm.startPrank(alice);
        pass.mint{value: PRICE}(alice, 1);
        vm.expectRevert(GenesisPass.WalletLimitReached.selector);
        pass.mint{value: PRICE}(alice, 1);
        vm.stopPrank();
    }

    function test_RevertWhen_QuantityAboveCap() public {
        _open();
        vm.prank(alice);
        vm.expectRevert(GenesisPass.WalletLimitReached.selector);
        pass.mint{value: PRICE * 2}(alice, 2);
    }

    function test_RevertWhen_QuantityZero() public {
        _open();
        vm.prank(alice);
        vm.expectRevert(GenesisPass.WalletLimitReached.selector);
        pass.mint{value: 0}(alice, 0);
    }

    function test_CapIsPerRecipientNotSender() public {
        _open();
        vm.startPrank(alice);
        pass.mint{value: PRICE}(bob, 1);
        vm.expectRevert(GenesisPass.WalletLimitReached.selector);
        pass.mint{value: PRICE}(bob, 1);
        pass.mint{value: PRICE}(alice, 1);
        vm.stopPrank();
        assertEq(pass.totalMinted(), 2);
    }

    function test_OwnerHasNoMintPrivilege() public {
        _open();
        vm.deal(owner, 1 ether);
        vm.startPrank(owner);
        pass.mint{value: PRICE}(owner, 1);
        vm.expectRevert(GenesisPass.WalletLimitReached.selector);
        pass.mint{value: PRICE}(owner, 1);
        vm.expectRevert(GenesisPass.IncorrectPayment.selector);
        pass.mint{value: 0}(bob, 1);
        vm.stopPrank();
    }

    // ---------------------------------------------------------- mint window

    function test_RevertWhen_BeforeStart() public {
        vm.prank(alice);
        vm.expectRevert(GenesisPass.MintNotOpen.selector);
        pass.mint{value: PRICE}(alice, 1);
    }

    function test_MintAtWindowBoundaries() public {
        vm.warp(start);
        vm.prank(alice);
        pass.mint{value: PRICE}(alice, 1);

        vm.warp(start + DURATION);
        vm.prank(bob);
        pass.mint{value: PRICE}(bob, 1);
        assertEq(pass.totalMinted(), 2);
    }

    function test_RevertWhen_AfterEnd() public {
        vm.warp(start + DURATION + 1);
        vm.prank(alice);
        vm.expectRevert(GenesisPass.MintClosed.selector);
        pass.mint{value: PRICE}(alice, 1);
    }

    function test_OwnerCanMoveWindow() public {
        vm.prank(owner);
        pass.setMintWindow(uint64(block.timestamp), uint64(block.timestamp + 1 days));
        vm.prank(alice);
        pass.mint{value: PRICE}(alice, 1);
        assertEq(pass.balanceOf(alice), 1);
    }

    function test_RevertWhen_NonOwnerSetsWindow() public {
        vm.prank(alice);
        vm.expectRevert();
        pass.setMintWindow(uint64(block.timestamp), uint64(block.timestamp + 1));
    }

    function test_RevertWhen_InvalidWindow() public {
        vm.prank(owner);
        vm.expectRevert(GenesisPass.InvalidWindow.selector);
        pass.setMintWindow(100, 100);
    }

    // ---------------------------------------------------------------- pause

    function test_PauseBlocksMint() public {
        _open();
        vm.prank(owner);
        pass.pause();
        assertFalse(pass.canMint(alice));
        vm.prank(alice);
        vm.expectRevert();
        pass.mint{value: PRICE}(alice, 1);

        vm.prank(owner);
        pass.unpause();
        vm.prank(alice);
        pass.mint{value: PRICE}(alice, 1);
        assertEq(pass.balanceOf(alice), 1);
    }

    function test_RevertWhen_NonOwnerPauses() public {
        vm.prank(alice);
        vm.expectRevert();
        pass.pause();
    }

    // ------------------------------------------------------------ royalties

    function test_RoyaltyInfo() public view {
        (address receiver, uint256 amount) = pass.royaltyInfo(1, 1 ether);
        assertEq(receiver, treasury);
        assertEq(amount, 0.05 ether); // 5%
        assertTrue(pass.supportsInterface(0x2a55205a)); // ERC-2981
        assertTrue(pass.supportsInterface(0x80ac58cd)); // ERC-721
    }

    function test_OwnerCanUpdateRoyalty() public {
        vm.prank(owner);
        pass.setDefaultRoyalty(alice, 250);
        (address receiver, uint256 amount) = pass.royaltyInfo(1, 1 ether);
        assertEq(receiver, alice);
        assertEq(amount, 0.025 ether);
    }

    function test_RevertWhen_NonOwnerUpdatesRoyalty() public {
        vm.prank(alice);
        vm.expectRevert();
        pass.setDefaultRoyalty(alice, 250);
    }

    // ----------------------------------------------------------- withdrawal

    function test_WithdrawSendsToTreasury() public {
        _open();
        vm.prank(alice);
        pass.mint{value: PRICE}(alice, 1);
        vm.prank(bob);
        pass.mint{value: PRICE}(bob, 1);

        uint256 before = treasury.balance;
        vm.prank(owner);
        pass.withdraw();
        assertEq(treasury.balance - before, PRICE * 2);
        assertEq(address(pass).balance, 0);
    }

    function test_RevertWhen_NonOwnerWithdraws() public {
        _open();
        vm.prank(alice);
        pass.mint{value: PRICE}(alice, 1);
        vm.prank(alice);
        vm.expectRevert();
        pass.withdraw();
    }

    function test_RevertWhen_NothingToWithdraw() public {
        vm.prank(owner);
        vm.expectRevert(GenesisPass.NothingToWithdraw.selector);
        pass.withdraw();
    }

    function test_RevertWhen_TreasuryRejects() public {
        Reverter r = new Reverter();
        vm.prank(owner);
        pass.setTreasury(address(r));
        _open();
        vm.prank(alice);
        pass.mint{value: PRICE}(alice, 1);
        vm.prank(owner);
        vm.expectRevert(GenesisPass.WithdrawFailed.selector);
        pass.withdraw();
    }

    // ----------------------------------------------------------- misc admin

    function test_SetBaseURI() public {
        _open();
        vm.prank(alice);
        pass.mint{value: PRICE}(alice, 1);
        vm.prank(owner);
        pass.setBaseURI("ipfs://new/");
        assertEq(pass.tokenURI(1), "ipfs://new/1");
    }

    function test_RevertWhen_NonOwnerSetsBaseURI() public {
        vm.prank(alice);
        vm.expectRevert();
        pass.setBaseURI("x");
    }

    function test_RevertWhen_TreasuryZero() public {
        vm.prank(owner);
        vm.expectRevert(GenesisPass.ZeroAddress.selector);
        pass.setTreasury(address(0));
    }
}
