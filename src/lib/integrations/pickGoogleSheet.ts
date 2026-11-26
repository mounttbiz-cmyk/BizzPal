"use client";

/**
 * Opens Google's own file picker, showing spreadsheets only, and returns the one chosen (or null if closed).
 * Picking a file is also what gives BizzPal permission to read it (Drive "file" access): nothing else is visible.
 */
export async function pickGoogleSheet(): Promise<{ id: string; name: string; mimeType: string } | null> {
  const cfgRes = await fetch("/api/integrations/google/drive/picker-config", { cache: "no-store" });
  const cfg = await cfgRes.json().catch(() => ({}));
  if (!cfg.success) throw new Error(cfg.connected === false ? "Connect Google Drive on the Integrations page first." : cfg.error || "Google Drive is not available right now.");

  const w = window as any;
  if (!w.gapi) {
    await new Promise<void>((resolve, reject) => {
      const el = document.createElement("script");
      el.src = "https://apis.google.com/js/api.js";
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => reject(new Error("Could not load Google's file picker. Check your internet connection."));
      document.head.appendChild(el);
    });
  }
  await new Promise<void>(resolve => w.gapi.load("picker", { callback: () => resolve() }));

  // Keep Google's picker above BizzPal's own windows
  const styleId = "google-picker-zindex-fix-v2";
  if (!document.getElementById(styleId)) {
    const s = document.createElement("style");
    s.id = styleId;
    s.textContent =
      ".picker-dialog-bg{position:fixed!important;inset:0!important;width:auto!important;height:auto!important;background:rgba(0,0,0,.5)!important;opacity:1!important;z-index:2147483000!important}" +
      ".picker-dialog{position:fixed!important;top:50%!important;left:50%!important;transform:translate(-50%,-50%)!important;max-width:94vw!important;max-height:92vh!important;border-radius:16px!important;overflow:hidden!important;z-index:2147483001!important}";
    document.head.appendChild(s);
  }

  const g = w.google.picker;
  return new Promise(resolve => {
    const picker = new g.PickerBuilder()
      .setOAuthToken(cfg.accessToken)
      .setDeveloperKey(cfg.apiKey)
      .setAppId(cfg.appId)
      .setOrigin(`${window.location.protocol}//${window.location.host}`)
      .addView(new g.DocsView(g.ViewId.SPREADSHEETS))
      .setTitle("Choose your lead sheet")
      .setCallback((data: any) => {
        if (data.action === g.Action.PICKED && data.docs?.[0]) {
          const d = data.docs[0];
          resolve({ id: d.id, name: d.name, mimeType: d.mimeType });
        } else if (data.action === g.Action.CANCEL) {
          resolve(null);
        }
      })
      .build();
    picker.setVisible(true);
  });
}
