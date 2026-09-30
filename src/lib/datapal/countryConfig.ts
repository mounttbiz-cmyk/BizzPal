export interface CountryPostalConfig {
  countryCode: string;
  hasPostalCode: boolean;
  label: string; // e.g. "PIN Code", "ZIP Code", "Postcode", "Postal Code"
  placeholder: string;
  pattern?: RegExp;
  example: string;
  formatDescription: string;
  dialCode: string;
}

export const COUNTRY_POSTAL_CONFIGS: Record<string, CountryPostalConfig> = {
  IN: {
    countryCode: "IN",
    hasPostalCode: true,
    label: "PIN code",
    placeholder: "6 digits (e.g. 400001)",
    pattern: /^[1-9][0-9]{5}$/,
    example: "400001",
    formatDescription: "6-digit PIN code",
    dialCode: "+91",
  },
  US: {
    countryCode: "US",
    hasPostalCode: true,
    label: "ZIP code",
    placeholder: "5 digits (e.g. 90210)",
    pattern: /^\d{5}(-\d{4})?$/,
    example: "90210",
    formatDescription: "5-digit ZIP code",
    dialCode: "+1",
  },
  GB: {
    countryCode: "GB",
    hasPostalCode: true,
    label: "Postcode",
    placeholder: "e.g. SW1A 1AA",
    pattern: /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i,
    example: "SW1A 1AA",
    formatDescription: "UK Postal code",
    dialCode: "+44",
  },
  CA: {
    countryCode: "CA",
    hasPostalCode: true,
    label: "Postal code",
    placeholder: "A1A 1A1",
    pattern: /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/,
    example: "M5V 2T6",
    formatDescription: "Format: A1A 1A1",
    dialCode: "+1",
  },
  AE: {
    countryCode: "AE",
    hasPostalCode: false, // UAE generally does not use consumer postal codes
    label: "P.O. Box",
    placeholder: "Optional P.O. Box",
    example: "",
    formatDescription: "P.O. Box (Optional)",
    dialCode: "+971",
  },
  AU: {
    countryCode: "AU",
    hasPostalCode: true,
    label: "Postcode",
    placeholder: "4 digits (e.g. 2000)",
    pattern: /^\d{4}$/,
    example: "2000",
    formatDescription: "4-digit postcode",
    dialCode: "+61",
  },
  SG: {
    countryCode: "SG",
    hasPostalCode: true,
    label: "Postal code",
    placeholder: "6 digits (e.g. 238801)",
    pattern: /^\d{6}$/,
    example: "238801",
    formatDescription: "6-digit postal code",
    dialCode: "+65",
  },
  DE: {
    countryCode: "DE",
    hasPostalCode: true,
    label: "PLZ (Postcode)",
    placeholder: "5 digits (e.g. 10115)",
    pattern: /^\d{5}$/,
    example: "10115",
    formatDescription: "5-digit PLZ",
    dialCode: "+49",
  },
};

export const DEFAULT_POSTAL_CONFIG: CountryPostalConfig = {
  countryCode: "GLOBAL",
  hasPostalCode: true,
  label: "Postal code",
  placeholder: "Postal / ZIP code",
  pattern: /^[A-Za-z0-9\s-]{3,10}$/,
  example: "",
  formatDescription: "Valid postal code",
  dialCode: "",
};

export function getCountryPostalConfig(countryCode: string): CountryPostalConfig {
  const code = (countryCode || "").toUpperCase();
  return COUNTRY_POSTAL_CONFIGS[code] || {
    ...DEFAULT_POSTAL_CONFIG,
    countryCode: code,
  };
}

export function validatePostalCode(
  countryCode: string,
  code: string
): { isValid: boolean; message?: string } {
  if (!code || !code.trim()) {
    return { isValid: true }; // Optional field never blocks when empty
  }

  const trimmed = code.trim();
  const config = getCountryPostalConfig(countryCode);

  if (!config.hasPostalCode) {
    return { isValid: true };
  }

  if (config.pattern && !config.pattern.test(trimmed)) {
    return {
      isValid: false,
      message: `Enter a valid ${config.formatDescription}`,
    };
  }

  return { isValid: true };
}
