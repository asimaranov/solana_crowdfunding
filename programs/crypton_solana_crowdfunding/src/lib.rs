use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[account]
pub struct CrowdfundingAccount {
    pub owner: Pubkey,
    pub balance: u64,
}

#[program]
pub mod crypton_solana_crowdfunding {
    use anchor_lang::solana_program::{program::invoke, system_instruction};

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let crowdfunding_account = &mut ctx.accounts.crowdfunding_account;
        crowdfunding_account.owner = *ctx.accounts.owner.key;
        Ok(())
    }

    pub fn make_donation(ctx: Context<MakeDonation>, amount: u64) -> Result<()> {
        let transfer_instruction = system_instruction::transfer(
            ctx.accounts.donater.key,
            &ctx.accounts.crowdfunding_account.key(),
            amount,
        );

        invoke(
            &transfer_instruction,
            &[
                ctx.accounts.donater.to_account_info(),
                ctx.accounts.crowdfunding_account.to_account_info(),
            ],
        )?;

        let crowdfunding_account = &mut ctx.accounts.crowdfunding_account;
        crowdfunding_account.balance += amount;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer=owner, space=8+32+64)]
    pub crowdfunding_account: Account<'info, CrowdfundingAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MakeDonation<'info> {
    #[account(mut)]
    pub crowdfunding_account: Account<'info, CrowdfundingAccount>,
    #[account(mut)]
    pub donater: Signer<'info>,
    pub system_program: Program<'info, System>,

}
