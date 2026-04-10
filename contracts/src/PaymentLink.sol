// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// PaymentLink contract: createLink, pay, getLink, getCreatorLinks

contract PaymentLink {

    struct Link {
        address payable creator;
        uint256 amount;
        string description;
        bool paid;
        address payer;
        uint256 paidAt;
    }

    mapping(bytes32 => Link) public links;

    // tracks all linkIds per creator wallet for payment history.

    mapping(address => bytes32[]) public creatorLinks;


    event LinkCreated(bytes32 indexed linkId, address indexed creator, uint256 amount, string description);

    event LinkPaid(bytes32 indexed linkId, address indexed payer, uint256 paidAt);

    error LinkExists();
    error LinkNotFound();
    error AlreadyPaid();
    error WrongAmount();

    function createLink(bytes32 linkId, uint256 amount, string calldata description) external {
        
        if (links[linkId].creator != address(0)) revert LinkExists();

        links[linkId] = Link(payable(msg.sender), amount, description, false, address(0), 0);

        creatorLinks[msg.sender].push(linkId);

        emit LinkCreated(linkId, msg.sender, amount, description);
        
    }

    function pay(bytes32 linkId) external payable {
        Link storage link = links[linkId];
        if(link.creator == address(0)) revert LinkNotFound();
    }


}
