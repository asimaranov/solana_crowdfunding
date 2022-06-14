import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { BN } from "bn.js";
import { expect } from "chai";
import { CryptonSolanaCrowdfunding } from "../target/types/crypton_solana_crowdfunding";
import { PublicKey } from '@solana/web3.js';

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

  it("Test registration", async () => {
    await provider.connection.confirmTransaction(await provider.connection.requestAirdrop(donater.publicKey, testSolAmount * anchor.web3.LAMPORTS_PER_SOL));
    const initialDonaterBalance = await provider.connection.getBalance(donater.publicKey);
    expect(initialDonaterBalance).to.equal(testSolAmount * anchor.web3.LAMPORTS_PER_SOL);

    await program.methods.initialize()
      .accounts({ crowdfundingAccount: crowdfundingKeypair.publicKey, owner: owner.publicKey })
      .signers([crowdfundingKeypair]).rpc();

    const [userInfoPda, _] = await PublicKey.findProgramAddress([anchor.utils.bytes.utf8.encode("user-info"), donater.publicKey.toBuffer()], program.programId);
    await program.methods.register().accounts({ user: donater.publicKey, userInfo: userInfoPda }).signers([donater]).rpc();
  });

  it("Test donation", async () => {
    await provider.connection.confirmTransaction(await provider.connection.requestAirdrop(donater.publicKey, testSolAmount * anchor.web3.LAMPORTS_PER_SOL));
    const initialDonaterBalance = await provider.connection.getBalance(donater.publicKey);
    expect(initialDonaterBalance).to.equal(testSolAmount * anchor.web3.LAMPORTS_PER_SOL);

    await program.methods.initialize()
      .accounts({ crowdfundingAccount: crowdfundingKeypair.publicKey, owner: owner.publicKey })
      .signers([crowdfundingKeypair]).rpc();

    const [userInfoPda, _] = await PublicKey.findProgramAddress([anchor.utils.bytes.utf8.encode("user-info"), donater.publicKey.toBuffer()], program.programId);
    await program.methods.register().accounts({ user: donater.publicKey, userInfo: userInfoPda }).signers([donater]).rpc();

    await program.methods
      .makeDonation(new BN(testSolAmount))
      .accounts({ crowdfundingAccount: crowdfundingKeypair.publicKey, donater: donater.publicKey, donaterInfo: userInfoPda })
      .signers([donater])
      .rpc();

    let crowdfundingState = await program.account.crowdfundingAccount.fetch(crowdfundingKeypair.publicKey);

    expect(crowdfundingState.balance.eq(new BN(testSolAmount))).to.be.true;
    expect(initialDonaterBalance - testSolAmount * anchor.web3.LAMPORTS_PER_SOL).to.be.lte(await provider.connection.getBalance(donater.publicKey));
  });

  it("Test donation in case of insufficient funds", async () => {
    await program.methods.initialize()
      .accounts({ crowdfundingAccount: crowdfundingKeypair.publicKey, owner: owner.publicKey })
      .signers([crowdfundingKeypair]).rpc();

    await program.methods
      .makeDonation(new BN(testSolAmount))
      .accounts({ crowdfundingAccount: crowdfundingKeypair.publicKey, donater: donater.publicKey })
      .signers([donater])
      .rpc().catch(err => expect(err).to.exist);

  });

  it("Check that owner can't withdraw money if no one donated", async () => {
    await program.methods.initialize()
      .accounts({ crowdfundingAccount: crowdfundingKeypair.publicKey, owner: owner.publicKey })
      .signers([crowdfundingKeypair]).rpc();

    await program.methods.withdraw()
      .accounts({ crowdfundingAccount: crowdfundingKeypair.publicKey, owner: owner.publicKey })
      .rpc().catch(err => expect(err.error.errorMessage).to.equal("Nothing to withdraw"));
  });

  it("Check withdrawing", async () => {
    await provider.connection.confirmTransaction(await provider.connection.requestAirdrop(donater.publicKey, testSolAmount * anchor.web3.LAMPORTS_PER_SOL));

    await program.methods.initialize()
      .accounts({ crowdfundingAccount: crowdfundingKeypair.publicKey, owner: owner.publicKey })
      .signers([crowdfundingKeypair]).rpc();


    const [userInfoPda, _] = await PublicKey.findProgramAddress([anchor.utils.bytes.utf8.encode("user-info"), donater.publicKey.toBuffer()], program.programId);
    await program.methods.register().accounts({ user: donater.publicKey, userInfo: userInfoPda }).signers([donater]).rpc();

    await program.methods
      .makeDonation(new BN(testSolAmount))
      .accounts({ crowdfundingAccount: crowdfundingKeypair.publicKey, donater: donater.publicKey, donaterInfo: userInfoPda })
      .signers([donater])
      .rpc();

    await program.methods.withdraw()
      .accounts({ crowdfundingAccount: crowdfundingKeypair.publicKey, owner: owner.publicKey })
      .rpc();
    
    // let crowdfundingState = await program.account.crowdfundingAccount.fetch(crowdfundingKeypair.publicKey);

    // expect(crowdfundingState.balance.eq(new BN(0)));

  });
});
