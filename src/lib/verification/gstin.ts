/**
 * GSTIN / PAN structural validation.
 *
 * This proves a number is *well-formed* (right shape, right check digit, plausible state and
 * entity type). It does NOT prove the GSTIN exists or belongs to anyone: that needs the GST
 * registry (see registry.ts). Pure functions, safe on both client and server.
 */

const CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra", "29": "Karnataka", "30": "Goa",
  "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
  "35": "Andaman & Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
  "97": "Other Territory", "99": "Centre Jurisdiction",
};

/** 4th character of a PAN tells what kind of taxpayer it is. */
export const PAN_ENTITY_TYPES: Record<string, string> = {
  P: "Individual / Proprietor",
  C: "Company",
  H: "Hindu Undivided Family",
  F: "Partnership Firm / LLP",
  A: "Association of Persons",
  B: "Body of Individuals",
  T: "Trust",
  L: "Local Authority",
  J: "Artificial Juridical Person",
  G: "Government",
};

const GSTIN_SHAPE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_SHAPE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export function normalizeGstin(input: string): string {
  return (input || "").replace(/[\s-]/g, "").toUpperCase();
}

/** Expected 15th character for the first 14 characters of a GSTIN. */
export function gstinCheckChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const idx = CHARSET.indexOf(first14[i]);
    if (idx < 0) return "";
    const product = idx * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHARSET[(36 - (sum % 36)) % 36];
}

export type GstinCheck =
  | { valid: false; reason: string }
  | {
      valid: true;
      gstin: string;
      stateCode: string;
      state: string;
      pan: string;
      entityType: string;
      entityCode: string;
    };

export function checkGstin(input: string): GstinCheck {
  const gstin = normalizeGstin(input);
  if (!gstin) return { valid: false, reason: "Enter your 15-character GSTIN." };
  if (gstin.length < 15) return { valid: false, reason: `A GSTIN has 15 characters (you have entered ${gstin.length}).` };
  if (gstin.length > 15) return { valid: false, reason: "A GSTIN has exactly 15 characters." };
  if (!GSTIN_SHAPE.test(gstin)) {
    return { valid: false, reason: "This does not look like a GSTIN. Check the format, for example 27AAPFU0939F1ZV." };
  }
  const stateCode = gstin.slice(0, 2);
  const state = GST_STATE_CODES[stateCode];
  if (!state) return { valid: false, reason: `State code ${stateCode} is not a valid GST state code.` };
  const pan = gstin.slice(2, 12);
  const entityType = PAN_ENTITY_TYPES[pan[3]];
  if (!entityType) return { valid: false, reason: "The PAN inside this GSTIN has an unknown entity type." };
  if (gstinCheckChar(gstin.slice(0, 14)) !== gstin[14]) {
    return { valid: false, reason: "The last character (check digit) does not match, so there is probably a typing mistake." };
  }
  return { valid: true, gstin, stateCode, state, pan, entityType, entityCode: pan[3] };
}

export function isValidPan(pan: string): boolean {
  return PAN_SHAPE.test((pan || "").trim().toUpperCase());
}
