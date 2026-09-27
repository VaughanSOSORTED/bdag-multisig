import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("BdagVote", () => {
  async function deployFixture() {
    const [treasury, voter, outsider] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const quorum = ethers.parseEther("100");
    const Vote = await ethers.getContractFactory("BdagVote");
    const vote = await Vote.deploy(
      await token.getAddress(),
      treasury.address,
      quorum
    );
    await vote.waitForDeployment();

    await token.mint(voter.address, ethers.parseEther("150"));
    await token.mint(outsider.address, 0);

    return { treasury, voter, outsider, token, vote, quorum };
  }

  it("only treasury can create proposals", async () => {
    const { vote, voter } = await deployFixture();

    await expect(
      vote
        .connect(voter)
        .createProposal("Pay contributor", voter.address, "0x", 3600)
    ).to.be.revertedWithCustomError(vote, "NotTreasury");
  });

  it("rejects bad proposal durations", async () => {
    const { vote, treasury, voter } = await deployFixture();

    await expect(
      vote
        .connect(treasury)
        .createProposal("Bad", voter.address, "0x", 0)
    ).to.be.revertedWithCustomError(vote, "BadParams");

    await expect(
      vote
        .connect(treasury)
        .createProposal("Bad", voter.address, "0x", 31 * 24 * 60 * 60)
    ).to.be.revertedWithCustomError(vote, "BadParams");
  });

  it("records weighted votes and blocks double voting", async () => {
    const { vote, treasury, voter } = await deployFixture();

    await vote
      .connect(treasury)
      .createProposal("Signal spend", voter.address, "0x", 3600);

    await expect(vote.connect(voter).vote(1, true))
      .to.emit(vote, "Voted")
      .withArgs(1, voter.address, true, ethers.parseEther("150"));

    await expect(vote.connect(voter).vote(1, false)).to.be.revertedWithCustomError(
      vote,
      "AlreadyVoted"
    );

    const proposal = await vote.proposals(1);
    expect(proposal.forVotes).to.equal(ethers.parseEther("150"));
    expect(proposal.againstVotes).to.equal(0n);
  });

  it("rejects votes with no token power", async () => {
    const { vote, treasury, outsider, voter } = await deployFixture();

    await vote
      .connect(treasury)
      .createProposal("Signal", voter.address, "0x", 3600);

    await expect(
      vote.connect(outsider).vote(1, true)
    ).to.be.revertedWithCustomError(vote, "NoVotingPower");
  });

  it("closes voting after the window and computes passed()", async () => {
    const { vote, treasury, voter, outsider, token, quorum } =
      await deployFixture();

    await token.mint(outsider.address, ethers.parseEther("10"));

    await vote
      .connect(treasury)
      .createProposal("Pass me", voter.address, "0x", 100);

    await vote.connect(voter).vote(1, true);
    expect(await vote.passed(1)).to.equal(false);

    await time.increase(101);
    expect(await vote.passed(1)).to.equal(true);
    expect(quorum).to.equal(ethers.parseEther("100"));

    await expect(
      vote.connect(outsider).vote(1, true)
    ).to.be.revertedWithCustomError(vote, "VotingClosed");
  });

  it("does not move treasury funds when a proposal passes or is marked executed", async () => {
    const { vote, treasury, voter, token } = await deployFixture();
    const treasuryBefore = await ethers.provider.getBalance(treasury.address);
    const tokenBefore = await token.balanceOf(treasury.address);

    await vote
      .connect(treasury)
      .createProposal("No auto-spend", voter.address, "0x", 10);
    await vote.connect(voter).vote(1, true);
    await time.increase(11);

    expect(await vote.passed(1)).to.equal(true);

    await vote.connect(treasury).markExecuted(1);
    const proposal = await vote.proposals(1);
    expect(proposal.executed).to.equal(true);

    const treasuryAfter = await ethers.provider.getBalance(treasury.address);
    // Gas can decrease ETH; assert no unexpected ETH credit and no token drain.
    expect(treasuryAfter).to.be.lte(treasuryBefore);
    expect(await token.balanceOf(treasury.address)).to.equal(tokenBefore);
    expect(await token.balanceOf(await vote.getAddress())).to.equal(0n);
  });

  it("only treasury can markExecuted and setQuorum", async () => {
    const { vote, treasury, voter } = await deployFixture();

    await vote
      .connect(treasury)
      .createProposal("x", voter.address, "0x", 10);

    await expect(
      vote.connect(voter).markExecuted(1)
    ).to.be.revertedWithCustomError(vote, "NotTreasury");

    await expect(
      vote.connect(voter).setQuorum(1)
    ).to.be.revertedWithCustomError(vote, "NotTreasury");

    await vote.connect(treasury).setQuorum(ethers.parseEther("50"));
    expect(await vote.quorum()).to.equal(ethers.parseEther("50"));
  });
});
