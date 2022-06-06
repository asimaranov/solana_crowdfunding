use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[account]
pub struct CrowdfundingAccount {
    pub owner: Pubkey,
    pub balance: u64,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer=owner, space=8+32+8)]
    pub crowdfunding_account: Account<'info, CrowdfundingAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Register<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(init, payer=user, space = 8+8+1, seeds=[b"user-info", user.key().as_ref()], bump)]
    pub user_info: Account<'info, UserInfo>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct MakeDonation<'info> {
    #[account(mut)]
    pub crowdfunding_account: Account<'info, CrowdfundingAccount>,
    #[account(mut)]
    pub donater: Signer<'info>,
    #[account(mut, seeds=[b"user-info", donater.key().as_ref()], bump)]
    pub donater_info: Account<'info, UserInfo>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct UserInfo {
    pub total_donations: u64,
    pub bump: u8
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub crowdfunding_account: Account<'info, CrowdfundingAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum CrowdfundingError {
    #[msg("You're not the owner")]
    NotTheOwner,
    #[msg("Nothing to withdraw")]
    NothingToWithdraw,
}

#[program]
pub mod crypton_solana_crowdfunding {
    use anchor_lang::solana_program::{program::invoke, program_error, system_instruction};

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let crowdfunding_account = &mut ctx.accounts.crowdfunding_account;
        crowdfunding_account.owner = *ctx.accounts.owner.key;
        Ok(())
    }
    
    pub fn register(ctx: Context<Register>) -> Result<()> {
        //let user_info_account = &mut ctx.accounts.user_info;
        //user_info_account.total_donations = 0;
        //user_info_account.bump = *ctx.bumps.get("user-info").unwrap();
        Ok(())
    }

    pub fn make_donation(ctx: Context<MakeDonation>, amount: u64) -> Result<()> {
        let user_info = &mut ctx.accounts.donater_info;
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
        user_info.total_donations += amount;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        if ctx.accounts.crowdfunding_account.owner != ctx.accounts.owner.key() {
            return Err(error!(CrowdfundingError::NotTheOwner));
        };

        if ctx.accounts.crowdfunding_account.balance == 0 {
            return Err(error!(CrowdfundingError::NothingToWithdraw));
        }

        let transfer_instruction = system_instruction::transfer(
            &ctx.accounts.crowdfunding_account.key(),
            ctx.accounts.owner.key,
            ctx.accounts.crowdfunding_account.balance,
        );

        invoke(
            &transfer_instruction,
            &[
                ctx.accounts.crowdfunding_account.to_account_info(),
                ctx.accounts.owner.to_account_info(),
            ],
        )?;

        let crowdfunding_account = &mut ctx.accounts.crowdfunding_account;
        crowdfunding_account.balance = 0;

        Ok(())
    }
}
