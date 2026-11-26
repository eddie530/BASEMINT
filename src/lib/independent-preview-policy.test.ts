import { describe, expect, it } from "vitest";
import { independentPreviewRuntimeAllowed, independentPreviewTransactionAllowed } from "./independent-preview-policy";
describe("independent preview staging lock", () => {
  it("denies runtime", () => expect(independentPreviewRuntimeAllowed()).toBe(false));
  it("denies transactions", () => expect(independentPreviewTransactionAllowed()).toBe(false));
});
