export function normalizePhone(input: string, defaultCountry = "BD"): string {
  const raw = input.trim().replace(/[\s().-]/g, "");
  if (raw.startsWith("+")) return raw;
  if (defaultCountry === "BD" && raw.startsWith("0")) return "+880" + raw.slice(1);
  throw new Error("Phone number must use E.164 format or a supported local format");
}
