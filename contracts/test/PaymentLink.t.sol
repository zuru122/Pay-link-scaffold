// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PaymentLink.sol";

contract PaymentLinkTest is Test {
    PaymentLink internal paymentLink;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    bytes32 internal constant LINK_ID_ONE = keccak256("link-one");
    bytes32 internal constant LINK_ID_TWO = keccak256("link-two");
    uint256 internal constant AMOUNT = 2.5 ether;

    function setUp() public {
        paymentLink = new PaymentLink();
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    function test_CreateAndPay() public {
        vm.prank(alice);
        paymentLink.createLink(LINK_ID_ONE, AMOUNT, "Logo design for Monad Hackathon Event in Lagos.");

        vm.prank(bob);
        paymentLink.pay{value: AMOUNT}(LINK_ID_ONE);

        (, , , bool paid, address payer, uint256 paidAt) = paymentLink.getLink(LINK_ID_ONE);

        assertTrue(paid);
        assertEq(payer, bob);
        assertGt(paidAt, 0);
    }

    function test_RevertIf_AlreadyPaid() public {
        vm.prank(alice);
        paymentLink.createLink(LINK_ID_ONE, AMOUNT, "Logo design for Monad Hackathon Event in Lagos.");

        vm.prank(bob);
        paymentLink.pay{value: AMOUNT}(LINK_ID_ONE);

        vm.expectRevert(PaymentLink.AlreadyPaid.selector);
        vm.prank(bob);
        paymentLink.pay{value: AMOUNT}(LINK_ID_ONE);
    }

    function test_RevertIf_WrongAmount() public {
        vm.prank(alice);
        paymentLink.createLink(LINK_ID_ONE, AMOUNT, "Logo design for Monad Hackathon Event in Lagos.");

        vm.expectRevert(PaymentLink.WrongAmount.selector);
        vm.prank(bob);
        paymentLink.pay{value: 1 ether}(LINK_ID_ONE);
    }

    function test_CreatorLinksTracked() public {
        vm.startPrank(alice);
        paymentLink.createLink(LINK_ID_ONE, 1 ether, "First invoice");
        paymentLink.createLink(LINK_ID_TWO, 2 ether, "Second invoice");
        vm.stopPrank();

        bytes32[] memory creatorLinkIds = paymentLink.getCreatorLinks(alice);

        assertEq(creatorLinkIds.length, 2);
        assertEq(creatorLinkIds[0], LINK_ID_ONE);
        assertEq(creatorLinkIds[1], LINK_ID_TWO);
    }

    function test_ReceiptData() public {
        vm.prank(alice);
        paymentLink.createLink(LINK_ID_ONE, AMOUNT, "Logo design for Monad Hackathon Event in Lagos.");

        vm.prank(bob);
        paymentLink.pay{value: AMOUNT}(LINK_ID_ONE);

        (, , , bool paid, address payer, uint256 paidAt) = paymentLink.getLink(LINK_ID_ONE);

        assertTrue(paid);
        assertEq(payer, bob);
        assertEq(paidAt, block.timestamp);
    }
}
