export const BASE = "https://sandbox-merchant.revolut.com";

export function toMinor(amountMajor: number) {
  return Math.round(amountMajor * 100);
}
