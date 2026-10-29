/**
 * BizzPal Enterprise Work Email Validator
 * Enforces valid format and rejects fake, disposable, and test email addresses.
 */

const BLOCKED_DOMAINS = new Set([
  // Disposable / Temporary mail services
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "10minutemail.com",
  "10minutemail.net",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
  "dispostable.com",
  "getairmail.com",
  "mohmal.com",
  "throwawaymail.com",
  "burnermail.io",
  "fakeinbox.com",
  "nada.ltd",
  "crazymailing.com",
  "generator.email",
  "emailondeck.com",
  "inboxkitten.com",
  "tempail.com",
  "fakemailgenerator.com",
  "mytemp.email",

  // Generic fake / dummy / placeholder domains
  "test.com",
  "example.com",
  "example.org",
  "example.net",
  "fake.com",
  "asdf.com",
  "qwerty.com",
  "foo.com",
  "bar.com",
  "xyz.com",
  "dummy.com",
  "none.com",
  "noemail.com",
  "admin.com",
  "temp.com",
  "123.com",
  "abc.com",
  "sample.com",
  "test.in",
  "test.org",
  "test.net",
  "test.co",
]);

const BLOCKED_LOCAL_PARTS = new Set([
  "test",
  "testing",
  "asdf",
  "qwerty",
  "fake",
  "dummy",
  "none",
  "noemail",
  "sample",
  "123456",
  "12345",
  "111111",
  "000000",
]);

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateWorkEmail(email: string): EmailValidationResult {
  if (!email || typeof email !== "string") {
    return { isValid: false, error: "Please enter your work email address." };
  }

  const clean = email.trim().toLowerCase();

  // Basic RFC-compliant email pattern check
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean)) {
    return { isValid: false, error: "Please enter a properly formatted email address (e.g., founder@company.com)." };
  }

  const parts = clean.split("@");
  if (parts.length !== 2) {
    return { isValid: false, error: "Invalid email address format." };
  }

  const [localPart, domain] = parts;

  // Local part checks
  if (localPart.length < 2) {
    return { isValid: false, error: "Email username is too short to be a valid work account." };
  }

  if (BLOCKED_LOCAL_PARTS.has(localPart)) {
    return { isValid: false, error: `"${localPart}" is a test/placeholder name. Please provide your real work email.` };
  }

  // Check repeating characters (e.g., aaaaa@..., 1111@...)
  if (/^(.)\1{4,}$/.test(localPart)) {
    return { isValid: false, error: "Please provide a real, non-placeholder email address." };
  }

  // Domain checks
  if (BLOCKED_DOMAINS.has(domain)) {
    return {
      isValid: false,
      error: `"${domain}" is a test or disposable email domain. Please use a real work or business email address.`,
    };
  }

  // Top-level domain check (must have at least 2 alpha characters after the dot)
  const domainParts = domain.split(".");
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
    return { isValid: false, error: "Email domain must have a valid extension (e.g. .com, .in, .io, .ai)." };
  }

  // Domain name check (the part before the TLD)
  const sld = domainParts[0];
  if (sld.length < 2) {
    return { isValid: false, error: "Email domain name is invalid." };
  }

  return { isValid: true };
}

