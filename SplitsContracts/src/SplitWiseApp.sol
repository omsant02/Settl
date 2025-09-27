// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ENS Interfaces for Sepolia
interface ENS {
    function setSubnodeOwner(bytes32 node, bytes32 label, address owner) external returns (bytes32);
    function setResolver(bytes32 node, address resolver) external;
    function owner(bytes32 node) external view returns (address);
    function resolver(bytes32 node) external view returns (address);
}

interface IAddrResolver {
    function setAddr(bytes32 node, address addr) external;
    function addr(bytes32 node) external view returns (address);
}

interface IReverseRegistrar {
    function setName(string memory name) external returns (bytes32);
    function node(address addr) external pure returns (bytes32);
}

/**
 * @title SplitWiseApp
 * @dev A Web3 expense splitting app with ENS subdomain integration
 * @notice Users get alice.settl.eth subdomains and can split expenses by ENS names
 */
contract SplitWiseApp is Ownable, ReentrancyGuard {
    
    // Sepolia ENS Contract Addresses
    ENS public constant ensRegistry = ENS(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e);
    IAddrResolver public constant publicResolver = IAddrResolver(0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5);
    IReverseRegistrar public constant reverseRegistrar = IReverseRegistrar(0xA0a1AbcDAe1a2a4A2EF8e9113Ff0e02DD81DC0C6);
    
    bytes32 public rootNode; // namehash for settl.eth
    
    // ENS Integration Layer
    mapping(address => string) public userSubdomains;
    mapping(string => address) public subdomainToAddress;
    mapping(bytes32 => bool) public subdomainExists;
    
    // Core Data Structures
    struct User {
        string subdomain;
        bool registered;
        uint256 registrationTime;
        uint256[] groupIds;
        uint256[] expenseIds;
    }
    
    struct Group {
        uint256 id;
        string name;
        address creator;
        address[] members;
        string[] memberSubdomains;
        uint256[] expenseIds;
        bool active;
        uint256 createdAt;
    }
    
    struct Expense {
        uint256 id;
        uint256 groupId;
        address paidBy;
        string paidBySubdomain;
        uint256 totalAmount;
        string description;
        string category;
        string receiptHash; // IPFS hash from Lighthouse
        bool fullySettled;
        uint256 timestamp;
    }
    
    struct Split {
        address debtor;
        string debtorSubdomain;
        uint256 amount;
        bool settled;
    }
    
    struct Settlement {
        address from;
        address to;
        uint256 amount;
        string txHash; // 1inch Fusion transaction hash
        string fromToken;
        string toToken;
        uint256 timestamp;
    }
    
    // Storage
    mapping(address => User) public users;
    mapping(uint256 => Group) public groups;
    mapping(uint256 => Expense) public expenses;
    mapping(uint256 => Split[]) public expenseSplits;
    mapping(uint256 => Settlement[]) public expenseSettlements;
    mapping(address => mapping(address => uint256)) public balances;
    
    // Counters
    uint256 public nextGroupId = 1;
    uint256 public nextExpenseId = 1;
    
    // Events
    event UserRegistered(address indexed user, string subdomain, string ensName);
    event GroupCreated(uint256 indexed groupId, string name, address indexed creator, string[] memberSubdomains);
    event ExpenseAdded(uint256 indexed expenseId, uint256 indexed groupId, address indexed paidBy, uint256 amount, string description);
    event ExpenseSettled(uint256 indexed expenseId, address indexed from, address indexed to, uint256 amount, string txHash);
    event SubdomainCreated(string subdomain, address indexed owner, bytes32 indexed node);
    
    constructor(bytes32 _rootNode, address _initialOwner) Ownable(_initialOwner) {
        rootNode = _rootNode;
    }
    
    modifier onlyRegisteredUser() {
        require(users[msg.sender].registered, "User not registered");
        _;
    }
    
    modifier validSubdomain(string memory subdomain) {
        require(bytes(subdomain).length >= 3 && bytes(subdomain).length <= 20, "Invalid subdomain length");
        require(subdomainToAddress[subdomain] == address(0), "Subdomain already taken");
        _;
    }
    
    function registerUser(string memory subdomain) 
        external 
        validSubdomain(subdomain)
        nonReentrant
    {
        require(!users[msg.sender].registered, "User already registered");
        require(_isValidSubdomainFormat(subdomain), "Invalid subdomain format");
        
        bytes32 labelHash = keccak256(bytes(subdomain));
        bytes32 createdSubnode = ensRegistry.setSubnodeOwner(rootNode, labelHash, msg.sender);
        
        ensRegistry.setResolver(createdSubnode, address(publicResolver));
        publicResolver.setAddr(createdSubnode, msg.sender);
        
        string memory fullName = string(abi.encodePacked(subdomain, ".settl.eth"));
        reverseRegistrar.setName(fullName);
        
        users[msg.sender] = User({
            subdomain: subdomain,
            registered: true,
            registrationTime: block.timestamp,
            groupIds: new uint256[](0),
            expenseIds: new uint256[](0)
        });
        
        userSubdomains[msg.sender] = subdomain;
        subdomainToAddress[subdomain] = msg.sender;
        subdomainExists[createdSubnode] = true;
        
        emit UserRegistered(msg.sender, subdomain, fullName);
        emit SubdomainCreated(subdomain, msg.sender, createdSubnode);
    }
    
    function createGroup(
        string memory groupName,
        string[] memory memberSubdomains
    ) external onlyRegisteredUser returns (uint256) {
        require(bytes(groupName).length > 0, "Group name cannot be empty");
        require(memberSubdomains.length > 0, "Group must have members");
        
        address[] memory members = new address[](memberSubdomains.length);
        for (uint i = 0; i < memberSubdomains.length; i++) {
            address memberAddr = subdomainToAddress[memberSubdomains[i]];
            require(memberAddr != address(0), "Subdomain not found");
            require(users[memberAddr].registered, "All members must be registered");
            members[i] = memberAddr;
        }
        
        bool creatorIncluded = false;
        for (uint i = 0; i < members.length; i++) {
            if (members[i] == msg.sender) {
                creatorIncluded = true;
                break;
            }
        }
        
        if (!creatorIncluded) {
            address[] memory expandedMembers = new address[](members.length + 1);
            string[] memory expandedSubdomains = new string[](memberSubdomains.length + 1);
            
            for (uint i = 0; i < members.length; i++) {
                expandedMembers[i] = members[i];
                expandedSubdomains[i] = memberSubdomains[i];
            }
            expandedMembers[members.length] = msg.sender;
            expandedSubdomains[memberSubdomains.length] = users[msg.sender].subdomain;
            
            members = expandedMembers;
            memberSubdomains = expandedSubdomains;
        }
        
        uint256 groupId = nextGroupId++;
        groups[groupId] = Group({
            id: groupId,
            name: groupName,
            creator: msg.sender,
            members: members,
            memberSubdomains: memberSubdomains,
            expenseIds: new uint256[](0),
            active: true,
            createdAt: block.timestamp
        });
        
        for (uint i = 0; i < members.length; i++) {
            users[members[i]].groupIds.push(groupId);
        }
        
        emit GroupCreated(groupId, groupName, msg.sender, memberSubdomains);
        return groupId;
    }
    
    function addExpense(
        uint256 groupId,
        uint256 totalAmount,
        string memory description,
        string memory category,
        string memory receiptHash,
        string[] memory debtorSubdomains,
        uint256[] memory splitAmounts
    ) external onlyRegisteredUser returns (uint256) {
        require(groups[groupId].active, "Group not active");
        require(totalAmount > 0, "Amount must be greater than 0");
        require(bytes(description).length > 0, "Description required");
        require(debtorSubdomains.length == splitAmounts.length, "Arrays length mismatch");
        require(debtorSubdomains.length > 0, "Must have debtors");
        require(_isGroupMember(groupId, msg.sender), "Only group members can add expenses");
        
        uint256 totalSplit = 0;
        for (uint i = 0; i < splitAmounts.length; i++) {
            require(splitAmounts[i] > 0, "Split amounts must be greater than 0");
            totalSplit += splitAmounts[i];
        }
        require(totalSplit == totalAmount, "Split amounts must equal total");
        
        uint256 expenseId = nextExpenseId++;
        
        expenses[expenseId] = Expense({
            id: expenseId,
            groupId: groupId,
            paidBy: msg.sender,
            paidBySubdomain: users[msg.sender].subdomain,
            totalAmount: totalAmount,
            description: description,
            category: category,
            receiptHash: receiptHash,
            fullySettled: false,
            timestamp: block.timestamp
        });
        
        for (uint i = 0; i < debtorSubdomains.length; i++) {
            address debtorAddr = subdomainToAddress[debtorSubdomains[i]];
            require(debtorAddr != address(0), "Debtor subdomain not found");
            require(_isGroupMember(groupId, debtorAddr), "All debtors must be group members");
            
            expenseSplits[expenseId].push(Split({
                debtor: debtorAddr,
                debtorSubdomain: debtorSubdomains[i],
                amount: splitAmounts[i],
                settled: false
            }));
            
            balances[debtorAddr][msg.sender] += splitAmounts[i];
        }
        
        groups[groupId].expenseIds.push(expenseId);
        users[msg.sender].expenseIds.push(expenseId);
        for (uint i = 0; i < debtorSubdomains.length; i++) {
            address debtorAddr = subdomainToAddress[debtorSubdomains[i]];
            users[debtorAddr].expenseIds.push(expenseId);
        }
        
        emit ExpenseAdded(expenseId, groupId, msg.sender, totalAmount, description);
        return expenseId;
    }
    
    function settleExpense(
        uint256 expenseId,
        uint256 debtorIndex,
        string memory fusionTxHash,
        string memory fromToken,
        string memory toToken
    ) external nonReentrant {
        Expense storage expense = expenses[expenseId];
        require(expense.id != 0, "Expense not found");
        require(debtorIndex < expenseSplits[expenseId].length, "Invalid debtor index");
        require(bytes(fusionTxHash).length > 0, "Transaction hash required");
        
        Split storage split = expenseSplits[expenseId][debtorIndex];
        require(split.debtor == msg.sender, "Only debtor can settle");
        require(!split.settled, "Already settled");
        
        uint256 amount = split.amount;
        address creditor = expense.paidBy;
        
        split.settled = true;
        balances[msg.sender][creditor] -= amount;
        
        expenseSettlements[expenseId].push(Settlement({
            from: msg.sender,
            to: creditor,
            amount: amount,
            txHash: fusionTxHash,
            fromToken: fromToken,
            toToken: toToken,
            timestamp: block.timestamp
        }));
        
        bool fullySettled = true;
        Split[] storage splits = expenseSplits[expenseId];
        for (uint i = 0; i < splits.length; i++) {
            if (!splits[i].settled) {
                fullySettled = false;
                break;
            }
        }
        expense.fullySettled = fullySettled;
        
        emit ExpenseSettled(expenseId, msg.sender, creditor, amount, fusionTxHash);
    }
    
    // View Functions
    function getUser(address userAddr) external view returns (
        string memory subdomain,
        bool registered,
        uint256 registrationTime,
        uint256[] memory groupIds,
        uint256[] memory expenseIds
    ) {
        User storage user = users[userAddr];
        return (user.subdomain, user.registered, user.registrationTime, user.groupIds, user.expenseIds);
    }
    
    function getGroup(uint256 groupId) external view returns (
        uint256 id,
        string memory name,
        address creator,
        address[] memory members,
        string[] memory memberSubdomains,
        uint256[] memory expenseIds,
        bool active,
        uint256 createdAt
    ) {
        Group storage group = groups[groupId];
        return (group.id, group.name, group.creator, group.members, group.memberSubdomains, group.expenseIds, group.active, group.createdAt);
    }
    
    function getExpense(uint256 expenseId) external view returns (
        uint256 id,
        uint256 groupId,
        address paidBy,
        string memory paidBySubdomain,
        uint256 totalAmount,
        string memory description,
        string memory category,
        string memory receiptHash,
        bool fullySettled,
        uint256 timestamp
    ) {
        Expense storage expense = expenses[expenseId];
        return (expense.id, expense.groupId, expense.paidBy, expense.paidBySubdomain, expense.totalAmount, expense.description, expense.category, expense.receiptHash, expense.fullySettled, expense.timestamp);
    }
    
    function getExpenseSplits(uint256 expenseId) external view returns (Split[] memory) {
        return expenseSplits[expenseId];
    }
    
    function getExpenseSettlements(uint256 expenseId) external view returns (Settlement[] memory) {
        return expenseSettlements[expenseId];
    }
    
    function getUserBalance(address debtor, address creditor) external view returns (uint256) {
        return balances[debtor][creditor];
    }
    
    function resolveSubdomain(string memory subdomain) external view returns (address) {
        return subdomainToAddress[subdomain];
    }
    
    function getUserSubdomain(address user) external view returns (string memory) {
        return userSubdomains[user];
    }
    
    // Internal Functions
    function _isValidSubdomainFormat(string memory subdomain) internal pure returns (bool) {
        bytes memory b = bytes(subdomain);
        for (uint i = 0; i < b.length; i++) {
            bytes1 char = b[i];
            if (!(char >= 0x30 && char <= 0x39) && // 0-9
                !(char >= 0x61 && char <= 0x7A) && // a-z
                char != 0x2D) { // hyphen
                return false;
            }
        }
        return true;
    }
    
    function _isGroupMember(uint256 groupId, address user) internal view returns (bool) {
        address[] memory members = groups[groupId].members;
        for (uint i = 0; i < members.length; i++) {
            if (members[i] == user) {
                return true;
            }
        }
        return false;
    }
    
    // Admin Functions
    function updateRootNode(bytes32 newRootNode) external onlyOwner {
        rootNode = newRootNode;
    }
    
    function deactivateGroup(uint256 groupId) external {
        require(
            groups[groupId].creator == msg.sender || owner() == msg.sender,
            "Only group creator or contract owner can deactivate"
        );
        groups[groupId].active = false;
    }
}