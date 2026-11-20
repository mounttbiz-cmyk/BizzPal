/**
 * Keeps one person's saved browser data from showing up for the next person who signs in on the same browser.
 *
 * The app keeps a copy of the business profile, logo, notes and similar items in this browser for speed. That copy
 * belongs to whoever was signed in, so it is stamped with their email and thrown away whenever a different
 * account signs in or the person signs out. The server stays the source of truth and refills what is needed.
 */

const OWNER_KEY = "bizzpal_data_owner";

/** Browser items that are not about the signed-in person, so they stay. */
const KEEP = new Set([
  "bizzpal_user_session",
  OWNER_KEY,
  "bizzpal_admin_session",
  "bizzpal_website_config",
  "bizzpal_config_timestamp",
  "bizzpal_dashboard_nav",
  "bizzpal_dashboard_widgets",
  "bizzpal_dashboard_features",
  "bizzpal_subscription_plans",
  "bizzpal_tools_catalog",
]);

/** Removes everything saved for the previous person. */
export function clearWorkspaceData() {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("bizzpal_") && !KEEP.has(key)) doomed.push(key);
    }
    doomed.forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch {}
}

/** Call once the server has confirmed who is signed in. Clears the old data when it belonged to someone else. */
export function claimBrowserFor(email: string) {
  try {
    const who = email.trim().toLowerCase();
    const owner = localStorage.getItem(OWNER_KEY);
    if (owner !== who) {
      clearWorkspaceData();
      localStorage.setItem(OWNER_KEY, who);
    }
  } catch {}
}

/** Call when the person signs out. */
export function forgetBrowserOwner() {
  clearWorkspaceData();
  try {
    localStorage.removeItem(OWNER_KEY);
  } catch {}
}
