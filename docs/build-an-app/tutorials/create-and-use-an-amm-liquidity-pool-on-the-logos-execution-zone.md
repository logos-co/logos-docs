---
title: Create and use an AMM liquidity pool on the Logos Execution Zone
doc_type: procedure
product: blockchain
topics: [lez]
steps_layout: sectioned
authors: kashepavadan
owner: logos
doc_version: 1
slug: create-and-use-an-amm-liquidity-pool-on-the-logos-execution-zone
---

# Create and use an AMM liquidity pool on the Logos Execution Zone

#### Get started creating a token pair pool, swapping, and managing liquidity on LEZ.

This procedure covers the AMM [program](../../get-started/glossary.md#program) on the [Logos Execution Zone](../../get-started/glossary.md#lez), which manages liquidity pools and enables swaps between custom tokens. It walks through creating a liquidity pool for a token pair, swapping tokens, withdrawing liquidity, and adding liquidity back to the pool.

:::info
The AMM does not currently charge swap fees or distribute rewards to liquidity providers. LP tokens represent only a proportional share of the pool reserves. Fee support will be added in future versions.
:::

Before you start, make sure you have the following:

- The `wallet` CLI installed and configured against a LEZ sequencer
- Two existing custom tokens (Token A and Token B) with funded holding accounts

## What to expect

- You can create a liquidity pool for a token pair and receive LP tokens representing your share.
- You can swap between the two tokens at a price determined by the pool's reserves.
- You can withdraw or add liquidity at any time, with the AMM enforcing your minimum and maximum thresholds.

## Step 1: Create a liquidity pool for a token pair

Create an account to hold your LP tokens, then deposit tokens A and B to initialise the pool. In return for providing liquidity, you receive LP tokens representing your share of the pool; they are required to withdraw liquidity later.

1. Create an account to hold your LP tokens:

   ```bash
   wallet account new public

   # Output:
   Generated new account with account_id Public/FHgLW9jW4HXMV6egLWbwpTqVAGiCHw2vkg71KYSuimVf
   ```

1. Initialise the pool by depositing tokens A and B and specifying the [account](../../get-started/glossary.md#account) that will receive LP tokens:

   ```bash
   wallet amm new \
       --user-holding-a Public/9RRSMm3w99uCD2Jp2Mqqf6dfc8me2tkFRE9HeU2DFftw \
       --user-holding-b Public/88f2zeTgiv9LUthQwPJbrmufb9SiDfmpCs47B7vw6Gd6 \
       --user-holding-lp Public/FHgLW9jW4HXMV6egLWbwpTqVAGiCHw2vkg71KYSuimVf \
       --balance-a 100 \
       --balance-b 200
   ```

   - The LP holding account is owned by the [token program](../../get-started/glossary.md#token-program), so LP tokens are managed using the same token infrastructure as regular tokens.

1. Confirm the LP holding account is now owned by the token program:

   ```bash
   wallet account get --account-id Public/FHgLW9jW4HXMV6egLWbwpTqVAGiCHw2vkg71KYSuimVf

   # Output:
   Holding account owned by token program
   {"account_type":"Token holding","definition_id":"7BeDS3e28MA5Err7gBswmR1fUKdHXqmUpTefNPu3pJ9i","balance":100}
   ```

   - If you inspect the `user-holding-a` and `user-holding-b` accounts, you will see that 100 and 200 tokens were deducted. Those tokens now reside in the pool and are available for swaps by any user.

## Step 2: Swap tokens

Use `wallet amm swap-exact-input` to swap a fixed input amount of one token for the other, at a price determined by the pool's reserves.

1. Run the swap, specifying the input amount, the minimum acceptable output, and the token you are providing:

   ```bash
   wallet amm swap-exact-input \
       --user-holding-a Public/9RRSMm3w99uCD2Jp2Mqqf6dfc8me2tkFRE9HeU2DFftw \
       --user-holding-b Public/88f2zeTgiv9LUthQwPJbrmufb9SiDfmpCs47B7vw6Gd6 \
       # The amount of tokens to swap
       --amount-in 5 \
       # The minimum number of tokens expected in return
       --min-amount-out 8 \
       # The definition ID of the token being provided to the swap
       # In this case, we are swapping from TOKENA to TOKENB, and so this is the definition ID of TOKENA
       --token-definition 4X9kAcnCZ1Ukkbm3nywW9xfCNPK8XaMWCk3zfs1sP4J7
   ```

   - Once executed, 5 tokens are deducted from the Token A holding account and the corresponding amount, computed by the pool's pricing function, is credited to the Token B holding account.

## Step 3: Withdraw liquidity from the pool

Redeem (burn) LP tokens to withdraw a proportional share of the pool's reserves.

:::warning
This burns `balance-lp` LP tokens from your LP holding account. The `min-amount-a` and `min-amount-b` parameters set the minimum acceptable outputs; if the computed amounts fall below either threshold, the instruction fails to protect you against unfavourable pool changes.
:::

1. Run `wallet amm remove-liquidity`, specifying how many LP tokens to redeem and your minimum acceptable outputs:

   ```bash
   wallet amm remove-liquidity \
       --user-holding-a Public/9RRSMm3w99uCD2Jp2Mqqf6dfc8me2tkFRE9HeU2DFftw \
       --user-holding-b Public/88f2zeTgiv9LUthQwPJbrmufb9SiDfmpCs47B7vw6Gd6 \
       --user-holding-lp Public/FHgLW9jW4HXMV6egLWbwpTqVAGiCHw2vkg71KYSuimVf \
       --balance-lp 20 \
       --min-amount-a 1 \
       --min-amount-b 1
   ```

   - In return, the AMM transfers tokens A and B from the pool vaults to your holding accounts, based on current reserves. The amount received is proportional to the share of LP tokens redeemed relative to the total LP supply.

## Step 4: Add liquidity to the pool

Deposit tokens A and B in the ratio implied by current pool reserves. In return, the AMM mints new LP tokens representing your proportional share.

:::warning
`max-amount-a` and `max-amount-b` cap how many tokens A and B can be taken from your accounts. `min-amount-lp` sets the minimum LP tokens to mint; if the computed LP amount falls below this threshold, the instruction fails.
:::

1. Run `wallet amm add-liquidity`, specifying your maximum acceptable deposits and minimum acceptable LP tokens minted:

   ```bash
   wallet amm add-liquidity \
       --user-holding-a Public/9RRSMm3w99uCD2Jp2Mqqf6dfc8me2tkFRE9HeU2DFftw \
       --user-holding-b Public/88f2zeTgiv9LUthQwPJbrmufb9SiDfmpCs47B7vw6Gd6 \
       --user-holding-lp Public/FHgLW9jW4HXMV6egLWbwpTqVAGiCHw2vkg71KYSuimVf \
       --min-amount-lp 1 \
       --max-amount-a 10 \
       --max-amount-b 10
   ```

   - The AMM computes the required amounts based on the pool's reserve ratio, and takes no more than your specified maximums.