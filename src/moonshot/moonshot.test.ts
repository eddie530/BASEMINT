import { describe, expect, it } from "vitest";
import { DAILY_ROUNDS, DAILY_STACK, RANKED_STAKE, PACK, LOOKS, resolveRound, crashFromRandom } from "./shared";
import { checkPayment } from "./server/payments";
import { encodeEventTopics, encodeAbiParameters, erc20Abi, type TransactionReceipt } from "viem";

describe("MOONSHOT rules", () => {
  it("ten daily flights of 100 from 1000 credits", () => {
    expect(DAILY_ROUNDS).toBe(10);
    expect(RANKED_STAKE).toBe(100);
    expect(DAILY_STACK).toBe(1000);
  });
  it("auto cash-out banks stake × target before crash", () => {
    expect(resolveRound(0, 3, 2, 10_000)).toEqual({ status: "cash", mult: 2, payout: 200 });
  });
  it("crash at 1.00 rugs instantly", () => {
    expect(crashFromRandom(0.01)).toBe(1);
    expect(resolveRound(0, 1, null, 0)?.status).toBe("rug");
  });
  it("cosmetic pack is 5 USDC on Base to the agreed recipient with three looks", () => {
    expect(PACK.units).toBe("5000000");
    expect(PACK.chainId).toBe(8453);
    expect(PACK.recipient).toBe("0xef1ff71edada68942b6ddfd5187888e84218297b");
    expect(LOOKS.filter((l) => l.premium).map((l) => l.name)).toEqual(["Acid lime", "Solar flare", "Ultraviolet"]);
  });
});

describe("payment proof guard", () => {
  const payer = "0x1111111111111111111111111111111111111111";
  const receipt = (value: bigint, to = PACK.recipient, status: "success" | "reverted" = "success") =>
    ({
      status,
      blockNumber: 100n,
      logs: [
        {
          address: PACK.token,
          topics: encodeEventTopics({ abi: erc20Abi, eventName: "Transfer", args: { from: payer, to } }),
          data: encodeAbiParameters([{ type: "uint256" }], [value]),
        },
      ],
    }) as unknown as TransactionReceipt;
  const t = 1_800_000_000;
  const run = (r: TransactionReceipt) => () => checkPayment(r, payer, t, t * 1000 - 1000, t * 1000 + 1000, 110n, 90n);
  it("accepts exactly 5 USDC to the recipient", () => expect(run(receipt(5_000_000n))).not.toThrow());
  it("rejects wrong amount", () => expect(run(receipt(4_999_999n))).toThrow());
  it("rejects wrong recipient", () => expect(run(receipt(5_000_000n, payer))).toThrow());
  it("rejects reverted tx", () => expect(run(receipt(5_000_000n, PACK.recipient, "reverted"))).toThrow());
});
