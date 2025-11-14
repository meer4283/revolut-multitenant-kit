export const BASE = "https://merchant.revolut.com"; // auth token decides sandbox vs live

export function toMinor(amountMajor: number) {
  return Math.round(amountMajor * 100);
}
