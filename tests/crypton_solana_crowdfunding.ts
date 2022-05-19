import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { BN } from "bn.js";
import { expect } from "chai";
import { CryptonSolanaCrowdfunding } from "../target/types/crypton_solana_crowdfunding";

describe("Crowdfunding test", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider);

  const program = anchor.workspace.CryptonSolanaCrowdfunding as Program<CryptonSolanaCrowdfunding>;

  let crowdfundingKeypair: anchor.web3.Keypair;
  const owner = (program.provider as anchor.AnchorProvider).wallet;
  let donater: anchor.web3.Keypair;

  const testSolAmount = 1000;

  beforeEach(async () => {
    crowdfundingKeypair = anchor.web3.Keypair.generate();
    donater = anchor.web3.Keypair.generate();
  });

  it("Test service initialization", async () => {

    await program.methods.initialize().accounts({ crowdfundingAccount: crowdfundingKeypair.publicKey, owner: owner.publicKey })
      .signers([crowdfundingKeypair]).rpc();

    let crowdfundingState = await program.account.crowdfundingAccount.fetch(crowdfundingKeypair.publicKey);
    expect(crowdfundingState.balance.eq(new BN(0)));
    expect(crowdfundingState.owner.equals(owner.publicKey)).to.be.true;
  });

  it("Test donation", async () => {
    await provider.connection.confirmTransaction(await provider.connection.requestAirdrop(donater.publicKey, testSolAmount * anchor.web3.LAMPORTS_PER_SOL));
    const initialDonaterBalance = await provider.connection.getBalance(donater.publicKey);
    expect(initialDonaterBalance).to.equal(testSolAmount * anchor.web3.LAMPORTS_PER_SOL);

    await program.methods.initialize()
      .accounts({ crowdfundingAccount: crowdfundingKeypair.publicKey, owner: owner.publicKey })
      .signers([crowdfundingKeypair]).rpc();

    await program.methods
      .makeDonation(new BN(testSolAmount))
      .accounts({ crowdfundingAccount: crowdfundingKeypair.publicKey, donater: donater.publicKey })
      .signers([donater])
      .rpc();

    let crowdfundingState = await program.account.crowdfundingAccount.fetch(crowdfundingKeypair.publicKey);

    expect(crowdfundingState.balance.eq(new BN(testSolAmount))).to.be.true;
    expect(initialDonaterBalance - testSolAmount * anchor.web3.LAMPORTS_PER_SOL).to.be.lte(await provider.connection.getBalance(donater.publicKey));
  });
});
