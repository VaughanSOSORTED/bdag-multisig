// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
}

/// @title BdagVote — token-gated, onchain sentiment voting for a Safe treasury.
/// @notice The Snapshot + Safe pattern onchain: votes record weighted
///         sentiment, but nothing executes automatically. Passing a proposal
///         just means the Safe owners should queue and sign the calldata.
///         Only the configured Safe (treasury) can create proposals.
/// @dev Vote weight = token balance at vote time. For a real snapshot use an
///      ERC20Votes-style checkpointed token; kept simple here on purpose.
contract BdagVote {
    struct Proposal {
        string title;
        address target;   // usually the Safe itself
        bytes data;       // calldata the Safe owners will sign if it passes
        uint64 start;
        uint64 end;
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;    // set by the Safe via markExecuted
    }

    IERC20 public immutable voteToken;
    address public immutable treasury; // the Safe multisig
    uint256 public quorum;             // whole token units (e.g. 100e18)
    uint256 public nextId = 1;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(uint256 indexed id, string title, address target, uint64 end);
    event Voted(uint256 indexed id, address indexed voter, bool support, uint256 weight);
    event Executed(uint256 indexed id);

    error NotTreasury();
    error VotingClosed();
    error AlreadyVoted();
    error NoVotingPower();
    error BadParams();

    constructor(IERC20 _voteToken, address _treasury, uint256 _quorum) {
        voteToken = _voteToken;
        treasury = _treasury;
        quorum = _quorum;
    }

    /// @notice Only the Safe treasury can create proposals (via a signed tx).
    function createProposal(
        string calldata title,
        address target,
        bytes calldata data,
        uint64 duration
    ) external returns (uint256 id) {
        if (msg.sender != treasury) revert NotTreasury();
        if (duration == 0 || duration > 30 days) revert BadParams();
        id = nextId++;
        proposals[id] = Proposal({
            title: title,
            target: target,
            data: data,
            start: uint64(block.timestamp),
            end: uint64(block.timestamp + duration),
            forVotes: 0,
            againstVotes: 0,
            executed: false
        });
        emit ProposalCreated(id, title, target, uint64(block.timestamp + duration));
    }

    /// @notice One vote per address per proposal, weighted by token balance.
    function vote(uint256 id, bool support) external {
        Proposal storage p = proposals[id];
        if (block.timestamp > p.end) revert VotingClosed();
        if (hasVoted[id][msg.sender]) revert AlreadyVoted();

        uint256 weight = voteToken.balanceOf(msg.sender);
        if (weight == 0) revert NoVotingPower();

        hasVoted[id][msg.sender] = true;
        if (support) p.forVotes += weight; else p.againstVotes += weight;
        emit Voted(id, msg.sender, support, weight);
    }

    /// @notice Passed = window over, quorum met, more for than against.
    function passed(uint256 id) public view returns (bool) {
        Proposal storage p = proposals[id];
        return block.timestamp > p.end
            && p.forVotes > p.againstVotes
            && p.forVotes >= quorum;
    }

    /// @notice The Safe calls this when it executes the queued calldata.
    function markExecuted(uint256 id) external {
        if (msg.sender != treasury) revert NotTreasury();
        proposals[id].executed = true;
        emit Executed(id);
    }

    function setQuorum(uint256 _quorum) external {
        if (msg.sender != treasury) revert NotTreasury();
        quorum = _quorum;
    }
}
