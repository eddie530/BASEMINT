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
  const receipt = (value: bigint, to: string = PACK.recipient, status: "success" | "reverted" = "success") =>
    ({
      status,
      blockNumber: 100n,
      logs: [
        {
          address: PACK.token,
          topics: encodeEventTopics({ abi: erc20Abi, eventName: "Transfer", args: { from: payer, to: to as `0x${string}` } }),
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

import { weekStart, utcDay } from "./shared";
import { shareCardPng, cardText } from "./server/png";
describe("weekly board window", () => {
  it("weeks start Monday UTC", () => {
    expect(weekStart(Date.parse("2026-10-18T23:59:59Z"))).toBe("2026-10-12"); // Sunday
    expect(weekStart(Date.parse("2026-10-19T00:00:00Z"))).toBe("2026-10-19"); // Monday
    expect(weekStart(Date.parse("2026-10-16T15:00:00Z"))).toBe("2026-10-12"); // Friday
    expect(utcDay(Date.parse("2026-10-16T23:59:59-02:00"))).toBe("2026-10-17");
  });
});
describe("share card PNG", () => {
  const ch = { id: "x", name: "Pilot é<b>", avatar: null, multiplier: 2.5, day: "2026-10-16", url: "" };
  it("encodes a real PNG at og and 3:2 embed sizes", async () => {
    for (const [f, h] of [["og", 630], ["embed", 800]] as const) {
      const b = await shareCardPng(ch, f);
      expect([...b.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      const v = new DataView(b.buffer);
      expect(v.getUint32(16)).toBe(1200);
      expect(v.getUint32(20)).toBe(h);
    }
  });
  it("sanitises names for the bitmap font", () => expect(cardText("Pilot é<b>")).toBe("PILOT E?B?"));
});
