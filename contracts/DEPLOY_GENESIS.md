# Deploying Resident Labs // GENESIS PASS

Contract: `contracts/src/GenesisPass.sol` — open-edition ERC-721, fixed price
0.0005 ETH, configurable 7-day window, hard cap of 1 per wallet, pausable,
ERC-2981 royalties (5% to treasury), owner-only `withdraw()` to treasury.
No privileged mint path: the owner pays the same price and is subject to the
same cap and window.

## 1. Prereqs

```bash
curl -L https://foundry.paradigm.xyz | bash && foundryup
cd contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit
```

## 2. Environment variables

Copy `contracts/.env.example` to `contracts/.env`, fill it, then `source .env`.

| Variable | Required | Meaning |
| --- | --- | --- |
| `BASE_SEPOLIA_RPC_URL` | yes (testnet) | e.g. `https://sepolia.base.org` |
| `BASE_RPC_URL` | yes (mainnet) | e.g. `https://mainnet.base.org` |
| `BASESCAN_API_KEY` | yes (verify) | Basescan/Etherscan v2 API key |
| `GENESIS_OWNER` | yes | Admin address (pause, window, royalty, withdraw) |
| `TREASURY_WALLET` | yes | Receives withdrawals and royalties |
| `GENESIS_BASE_URI` | yes | Metadata base, must end in `/` (e.g. `ipfs://CID/`) |
| `GENESIS_MINT_START` | yes | Unix timestamp the 7-day window opens |
| `GENESIS_MINT_DURATION` | no | Seconds; defaults to `604800` (7 days) |
| `GENESIS_PRICE_WEI` | no | Defaults to `500000000000000` (0.0005 ETH) |
| `GENESIS_ROYALTY_BPS` | no | Defaults to `500` (5%) |

Never put a private key in `.env` or in source. Import the deployer once into
Foundry's encrypted keystore:

```bash
cast wallet import deployer --interactive
```

Every command below then uses `--account deployer` and prompts for the password.

Handy: `GENESIS_MINT_START=$(date -u -d '+1 day' +%s)` (Linux) or
`$(date -u -v+1d +%s)` (macOS).

## 3. Build & test

```bash
forge build
forge test -vvv
```

## 4. Deploy to Base Sepolia first

```bash
forge script script/DeployGenesisSepolia.s.sol:DeployGenesisSepolia \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --account deployer \
  --broadcast --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

Point the frontend at the testnet deployment and mint once end-to-end:

```
VITE_GENESIS_CONTRACT=0x...            # printed GenesisPass address
VITE_GENESIS_MINT_START=2026-08-20T18:00:00Z   # must match GENESIS_MINT_START
```

## 5. Deploy to Base mainnet (after testnet passes)

The mainnet script asserts chain id 8453 and the agreed price / duration /
royalty before broadcasting.

```bash
forge script script/DeployGenesisMainnet.s.sol:DeployGenesisMainnet \
  --rpc-url $BASE_RPC_URL \
  --account deployer \
  --broadcast --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

Then set in the Lovable project env (production):

```
VITE_GENESIS_CONTRACT=0x...
VITE_GENESIS_MINT_START=<ISO-8601 UTC matching GENESIS_MINT_START>
```

`/genesis` and the homepage ecosystem status flip from Coming Soon to LIVE
automatically once those are set.

## 6. Verify after the fact (if `--verify` was skipped)

```bash
forge verify-contract <address> src/GenesisPass.sol:GenesisPass \
  --chain base --etherscan-api-key $BASESCAN_API_KEY \
  --constructor-args $(cast abi-encode \
    "constructor(string,string,string,address,address,uint256,uint64,uint64,uint96)" \
    "Resident Labs // GENESIS PASS" "GENESIS" "$GENESIS_BASE_URI" \
    $GENESIS_OWNER $TREASURY_WALLET 500000000000000 $GENESIS_MINT_START 604800 500)
```

## 7. Post-deploy operations

```bash
# read state
cast call $GENESIS "totalMinted()(uint256)"        --rpc-url $BASE_RPC_URL
cast call $GENESIS "canMint(address)(bool)" $WALLET --rpc-url $BASE_RPC_URL

# owner controls
cast send $GENESIS "pause()"   --account deployer --rpc-url $BASE_RPC_URL
cast send $GENESIS "unpause()" --account deployer --rpc-url $BASE_RPC_URL
cast send $GENESIS "setMintWindow(uint64,uint64)" <start> <end> --account deployer --rpc-url $BASE_RPC_URL
cast send $GENESIS "withdraw()" --account deployer --rpc-url $BASE_RPC_URL
```

## Frontend ABI compatibility

`src/lib/genesis.ts` uses `mint(address,uint256)`, `balanceOf(address)`,
`totalMinted()` and `mintPrice()` — all present with identical signatures, so no
UI change is required. Optional extras now available for richer UI:
`canMint(address)`, `mintStart()`, `mintEnd()`, `mintedBy(address)`,
`royaltyInfo(uint256,uint256)`.

Note: `mint()` requires exact payment (`msg.value == mintPrice * quantity`) — the
UI already sends exactly `priceWei`.
