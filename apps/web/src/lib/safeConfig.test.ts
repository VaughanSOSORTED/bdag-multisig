import { decodeFunctionData, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import {
  SENTINEL_OWNERS,
  buildAddOwnerData,
  buildChangeThresholdData,
  buildRemoveOwnerData,
  getPrevOwner,
  safeConfigAbi,
  validateAddOwner,
  validateChangeThreshold,
  validateRemoveOwner,
} from "./safeConfig";

const ownerA = "0x1111111111111111111111111111111111111111";
const ownerB = "0x2222222222222222222222222222222222222222";
const ownerC = "0x3333333333333333333333333333333333333333";

describe("getPrevOwner", () => {
  it("returns SENTINEL for the first owner", () => {
    expect(getPrevOwner([ownerA, ownerB], ownerA)).toBe(SENTINEL_OWNERS);
  });

  it("returns the previous owner for later entries", () => {
    expect(getPrevOwner([ownerA, ownerB, ownerC], ownerC)).toBe(ownerB);
  });

  it("is case-insensitive", () => {
    expect(getPrevOwner([ownerA, ownerB], ownerB.toUpperCase())).toBe(ownerA);
  });

  it("throws when owner is missing", () => {
    expect(() => getPrevOwner([ownerA], ownerB)).toThrow(
      "Owner not found on this Safe."
    );
  });
});

describe("validateAddOwner", () => {
  it("accepts a new owner and valid threshold", () => {
    expect(
      validateAddOwner({
        owner: ownerC,
        threshold: 2,
        currentOwners: [ownerA, ownerB],
      })
    ).toEqual({
      owner: getAddress(ownerC),
      threshold: 2,
    });
  });

  it("rejects invalid addresses", () => {
    expect(() =>
      validateAddOwner({
        owner: "not-an-address",
        threshold: 1,
        currentOwners: [ownerA],
      })
    ).toThrow("Enter a valid owner address.");
  });

  it("rejects duplicates", () => {
    expect(() =>
      validateAddOwner({
        owner: ownerA,
        threshold: 1,
        currentOwners: [ownerA, ownerB],
      })
    ).toThrow("That address is already an owner.");
  });

  it("rejects out-of-range thresholds", () => {
    expect(() =>
      validateAddOwner({
        owner: ownerC,
        threshold: 4,
        currentOwners: [ownerA, ownerB],
      })
    ).toThrow("Threshold must be between 1 and 3.");
  });
});

describe("validateRemoveOwner", () => {
  it("returns prevOwner and validates threshold", () => {
    expect(
      validateRemoveOwner({
        owner: ownerB,
        threshold: 1,
        currentOwners: [ownerA, ownerB],
      })
    ).toEqual({
      owner: getAddress(ownerB),
      prevOwner: ownerA,
      threshold: 1,
    });
  });

  it("blocks removing the last owner", () => {
    expect(() =>
      validateRemoveOwner({
        owner: ownerA,
        threshold: 1,
        currentOwners: [ownerA],
      })
    ).toThrow("Cannot remove the last Safe owner.");
  });

  it("rejects non-owners", () => {
    expect(() =>
      validateRemoveOwner({
        owner: ownerC,
        threshold: 1,
        currentOwners: [ownerA, ownerB],
      })
    ).toThrow("That address is not an owner of this Safe.");
  });
});

describe("validateChangeThreshold", () => {
  it("accepts a value in range", () => {
    expect(validateChangeThreshold({ threshold: 2, ownerCount: 3 })).toEqual({
      threshold: 2,
    });
  });

  it("rejects empty owner sets", () => {
    expect(() =>
      validateChangeThreshold({ threshold: 1, ownerCount: 0 })
    ).toThrow("Safe has no owners.");
  });

  it("rejects out-of-range thresholds", () => {
    expect(() =>
      validateChangeThreshold({ threshold: 4, ownerCount: 3 })
    ).toThrow("Threshold must be between 1 and 3.");
  });
});

describe("build*Data calldata", () => {
  it("encodes addOwnerWithThreshold", () => {
    const data = buildAddOwnerData(ownerA, 2);
    const decoded = decodeFunctionData({
      abi: safeConfigAbi,
      data,
    });
    expect(decoded.functionName).toBe("addOwnerWithThreshold");
    expect(decoded.args).toEqual([getAddress(ownerA), 2n]);
  });

  it("encodes removeOwner", () => {
    const data = buildRemoveOwnerData(SENTINEL_OWNERS, ownerA, 1);
    const decoded = decodeFunctionData({
      abi: safeConfigAbi,
      data,
    });
    expect(decoded.functionName).toBe("removeOwner");
    expect(decoded.args).toEqual([
      getAddress(SENTINEL_OWNERS),
      getAddress(ownerA),
      1n,
    ]);
  });

  it("encodes changeThreshold", () => {
    const data = buildChangeThresholdData(3);
    const decoded = decodeFunctionData({
      abi: safeConfigAbi,
      data,
    });
    expect(decoded.functionName).toBe("changeThreshold");
    expect(decoded.args).toEqual([3n]);
  });
});
