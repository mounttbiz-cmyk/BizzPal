/** Stable fingerprint of a business so the same one is not delivered twice. */
export function makeLeadSignature(lead: {
  name: string;
  city?: string;
  phone?: string | null;
  website?: string | null;
}): string {
  const normName = lead.name.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  const normCity = (lead.city || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  const normPhone = (lead.phone || "").replace(/[^0-9]/g, "").slice(-10);

  // A phone number is the strongest identifier
  if (normPhone && normPhone.length >= 8) {
    return `ph_${normPhone}`;
  }
  return `nc_${normName}_${normCity}`;
}
