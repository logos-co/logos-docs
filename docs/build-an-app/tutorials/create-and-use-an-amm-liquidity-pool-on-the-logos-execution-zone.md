# Create and use an AMM liquidity pool on the Logos Execution Zone

{% hint style="warning" %}

This page is an early draft and may be incomplete or incorrect. Expect changes, missing prerequisites, and commands that might not work in your setup. We are actively working to complete and verify this content.

{% endhint %}

This tutorial covers the AMM [program](/get-started/glossary#program) in [LEZ](/get-started/glossary#lez). The AMM manages liquidity pools and enables swaps between custom tokens. By the end, you will have practiced:

1. Creating a liquidity pool for a token pair.
2. Swapping tokens.
3. Withdrawing liquidity from the pool.
4. Adding liquidity to the pool.

## 1. Creating a liquidity pool for a token pair

We start by creating a pool for the tokens created earlier. In return for providing liquidity, you receive liquidity provider (LP) tokens. LP tokens represent your share of the pool and are required to withdraw liquidity later.

{% hint style="info" %}

The AMM does not currently charge swap fees or distribute rewards to liquidity providers. LP tokens therefore represent only a proportional share of the pool reserves. Fee support will be added in future versions.

{% endhint %}

### a. Create an LP holding account

```bash
wallet account new public

# Output:
Generated new account with account_id Public/FHgLW9jW4HXMV6egLWbwpTqVAGiCHw2vkg71KYSuimVf
```

### b. Initialise the pool

Deposit tokens A and B and specify the [account](/get-started/glossary#account) that will receive LP tokens:

```bash
wallet amm new \
    --user-holding-a Public/9RRSMm3w99uCD2Jp2Mqqf6dfc8me2tkFRE9HeU2DFftw \
    --user-holding-b Public/88f2zeTgiv9LUthQwPJbrmufb9SiDfmpCs47B7vw6Gd6 \
    --user-holding-lp Public/FHgLW9jW4HXMV6egLWbwpTqVAGiCHw2vkg71KYSuimVf \
    --balance-a 100 \
    --balance-b 200
```

{% hint style="warning" %}

The LP holding account is owned by the [token program](/get-started/glossary#token-program), so LP tokens are managed using the same token infrastructure as regular tokens.

{% endhint %}

```bash
wallet account get --account-id Public/FHgLW9jW4HXMV6egLWbwpTqVAGiCHw2vkg71KYSuimVf

# Output:
Holding account owned by token program
{"account_type":"Token holding","definition_id":"7BeDS3e28MA5Err7gBswmR1fUKdHXqmUpTefNPu3pJ9i","balance":100}
```

{% hint style="success" %}

If you inspect the `user-holding-a` and `user-holding-b` accounts, you will see that 100 and 200 tokens were deducted. Those tokens now reside in the pool and are available for swaps by any user.

{% endhint %}

## 2. Swapping

Use `wallet amm swap-exact-input` to perform a token swap:

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

Once executed, 5 tokens are deducted from the Token A holding account and the corresponding amount (computed by the pool’s pricing function) is credited to the Token B holding account.

## 3. Withdrawing liquidity from the pool

Liquidity providers can withdraw assets by redeeming (burning) LP tokens. The amount received is proportional to the share of LP tokens redeemed relative to the total LP supply.

Use `wallet amm remove-liquidity`:

```bash
wallet amm remove-liquidity \
    --user-holding-a Public/9RRSMm3w99uCD2Jp2Mqqf6dfc8me2tkFRE9HeU2DFftw \
    --user-holding-b Public/88f2zeTgiv9LUthQwPJbrmufb9SiDfmpCs47B7vw6Gd6 \
    --user-holding-lp Public/FHgLW9jW4HXMV6egLWbwpTqVAGiCHw2vkg71KYSuimVf \
    --balance-lp 20 \
    --min-amount-a 1 \
    --min-amount-b 1
```

{% hint style="warning" %}

This burns `balance-lp` LP tokens from the user’s LP holding account. In return, the AMM transfers tokens A and B from the pool vaults to the user’s holding accounts, based on current reserves.
The `min-amount-a` and `min-amount-b` parameters set the minimum acceptable outputs. If the computed amounts fall below either threshold, the instruction fails to protect against unfavourable pool changes.

{% endhint %}

## 4. Adding liquidity to the pool

To add liquidity, deposit tokens A and B in the ratio implied by current pool reserves. In return, the AMM mints new LP tokens that represent your proportional share.

Use `wallet amm add-liquidity`:

```bash
wallet amm add-liquidity \
    --user-holding-a Public/9RRSMm3w99uCD2Jp2Mqqf6dfc8me2tkFRE9HeU2DFftw \
    --user-holding-b Public/88f2zeTgiv9LUthQwPJbrmufb9SiDfmpCs47B7vw6Gd6 \
    --user-holding-lp Public/FHgLW9jW4HXMV6egLWbwpTqVAGiCHw2vkg71KYSuimVf \
    --min-amount-lp 1 \
    --max-amount-a 10 \
    --max-amount-b 10
```

{% hint style="warning" %}

`max-amount-a` and `max-amount-b` cap how many tokens A and B can be taken from the user’s accounts. The AMM computes the required amounts based on the pool’s reserve ratio.
`min-amount-lp` sets the minimum LP tokens to mint. If the computed LP amount falls below this threshold, the instruction fails.

{% endhint %}
