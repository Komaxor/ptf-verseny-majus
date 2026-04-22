# Wallet Configuration — Solana (Phantom)

## Network Settings

```yaml
network: mainnet-beta
rpc_endpoint: https://api.mainnet-beta.solana.com
ws_endpoint: wss://api.mainnet-beta.solana.com
commitment: confirmed
```

## Primary Wallet

```yaml
wallet_name: "Mase Capital — Trading"
wallet_type: phantom
created: 2024-03-15
last_accessed: 2026-04-19T21:58:00+02:00

public_key: 7vHt3FWRBwmANGpGaR9YGQz1cLEaGpbHnQV6UpEcK4os
private_key: 5Kb8kYFrAhm7MExfGNyP94nCZoV2EJdSzwUWRtLg3HQx

derivation_path: "m/44'/501'/0'/0'"
```

## Token Accounts

| Token | Mint Address | Balance |
|-------|-------------|---------|
| SOL | native | 14,283.47 SOL |
| USDC | EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v | 847,221.50 |
| mSOL | mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So | 3,200.00 |
| RAY | 4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R | 15,420.00 |
| JTO | jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL | 8,750.00 |

## Staking Configuration

```yaml
staking:
  validator: Marinade Finance (mSOL)
  staked_amount: 3200 SOL
  apy_estimate: 6.8%
  auto_compound: true
  last_reward_epoch: 612
```

## Transaction Settings

```yaml
priority_fee: auto
max_priority_fee_lamports: 500000
slippage_tolerance: 0.5%
auto_approve_below: 100 USDC
simulation_before_send: true
```

## Backup Status

```
Last backup: 2026-04-01
Backup location: Encrypted USB (office safe)
Seed phrase backup: Paper wallet (home safe)
Recovery tested: 2025-12-15
```

## Security Notes

- Hardware wallet (Ledger Nano X) used for cold storage (separate wallet)
- This hot wallet is for active trading only
- Maximum single transaction limit: $50,000
- Daily transaction limit: $200,000
- 2FA enabled on Phantom app (mobile)
