export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;

export const CONTRACT_ABI = [
  "function createLink(bytes32 linkId, uint256 amount, string calldata description) external",
  "function pay(bytes32 linkId) external payable",
  "function getLink(bytes32 linkId) external view returns (address creator, uint256 amount, string memory description, bool paid, address payer, uint256 paidAt)",
  "function getCreatorLinks(address creator) external view returns (bytes32[] memory)",
];
