# Basemint Contracts

Foundry suite for the Basemint protocol on Base. Includes:

- `BasemintERC20` — ERC20 with `Ownable`, `Pausable`, `Burnable`, `ReentrancyGuard`, owner mint.
- `BasemintERC721` — ERC721 with paid mint, max supply, treasury fee split, pausable, reentrancy guard.
- `TokenFactory` — deploys `BasemintERC20` instances, forwards creation fee to treasury.
- `NFTFactory` — deploys `BasemintERC721` collections with a protocol mint fee in bps.

## Prereqs

```bash
curl -L https://foundry.paradigm.xyz | bash && foundryup
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit
```

## Configure

```bash
cp .env.example .env
# fill BASE_RPC_URL, BASE_SEPOLIA_RPC_URL, BASESCAN_API_KEY, TREASURY_WALLET
source .env
```

## Secure key storage (never commit private keys)

Import once into Foundry's encrypted keystore:

```bash
cast wallet import deployer --interactive
```

All deploy commands then use `--account deployer` and prompt for the password.

## Build & test

```bash
forge build
forge test -vvv
```

## Deploy

### 1. Base Sepolia (testnet first)

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --account deployer \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

Save the printed addresses into the frontend `.env`:

```
VITE_TOKEN_FACTORY_BASE_SEPOLIA=0x...
VITE_NFT_FACTORY_BASE_SEPOLIA=0x...
```

### 2. Base mainnet (after testing)

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $BASE_RPC_URL \
  --account deployer \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

Save mainnet addresses:

```
VITE_TOKEN_FACTORY_BASE=0x...
VITE_NFT_FACTORY_BASE=0x...
```

### Single-contract deploy (alternative)

```bash
forge create ./src/TokenFactory.sol:TokenFactory \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --account deployer \
  --constructor-args <owner> <treasury> 100000000000000 \
  --verify
```

## Verify after the fact

```bash
forge verify-contract <address> src/TokenFactory.sol:TokenFactory \
  --chain base-sepolia --etherscan-api-key $BASESCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address,address,uint256)" <owner> <treasury> 100000000000000)
```

## Security

- Never put private keys in `.env` or in source. Use `cast wallet import`.
- Audit fee math, treasury address, and owner before mainnet deploy.
- Run `forge test` and consider `slither .` before going live.
