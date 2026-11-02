// CDP sobre um Edge headless já ouvindo na 9555: API simulada (mocks), sessão falsa, tema escuro e inglês.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function open({ mocksPath, dsf = 3, w = 390, h = 844, auth = true }) {
  const mocks = (await import(pathToFileURL(mocksPath).href + "?t=" + Date.now())).default;
  const target = await (await fetch("http://127.0.0.1:9555/json/new?about:blank", { method: "PUT" })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = new Map(); const errors = [];
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const now = Math.floor(Date.now() / 1000);
  const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const SESSION = { access_token: `${b({ alg: "HS256" })}.${b({ sub: "00000000-0000-0000-0000-000000000001", exp: now + 86400, aud: "authenticated", role: "authenticated" })}.sig`, refresh_token: "r", token_type: "bearer", expires_in: 86400, expires_at: now + 86400, user: { id: "00000000-0000-0000-0000-000000000001", email: "demo@getpublishub.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: { full_name: "Demo Creator" }, created_at: "2026-01-01T00:00:00Z" } };
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || m.error); pending.delete(m.id); return; }
    if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description?.slice(0, 200));
    if (m.method === "Fetch.requestPaused") {
      const req = m.params.request, p = new URL(req.url).pathname;
      const cors = [{ name: "Access-Control-Allow-Origin", value: "http://localhost:3123" }, { name: "Access-Control-Allow-Headers", value: "*" }, { name: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" }, { name: "Content-Type", value: "application/json" }];
      const key = Object.keys(mocks).sort((a, c) => c.length - a.length).find((k) => p.startsWith(k));
      let body = "{}";
      const val = key && req.method !== "OPTIONS" ? (typeof mocks[key] === "function" ? mocks[key](req) : mocks[key]) : null;
      if (val && val.__file) {
        const raw = readFileSync(val.__file);
        send("Fetch.fulfillRequest", { requestId: m.params.requestId, responseCode: 200, responseHeaders: [cors[0], { name: "Content-Type", value: val.type || "video/mp4" }], body: raw.toString("base64") });
        return;
      }
      if (req.method === "OPTIONS") body = "";
      else if (key) body = JSON.stringify(val);
      else if (p.includes("/user")) body = JSON.stringify(SESSION.user);
      send("Fetch.fulfillRequest", { requestId: m.params.requestId, responseCode: 200, responseHeaders: cors, body: Buffer.from(body).toString("base64") });
    }
  };
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  await send("Network.setUserAgentOverride", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1", acceptLanguage: "en-US,en" });
  await send("Emulation.setLocaleOverride", { locale: "en-US" });
  await send("Network.setCookie", { name: "NEXT_LOCALE", value: "en", url: "http://localhost:3123/" });
  await send("Fetch.enable", { patterns: [{ urlPattern: "*localhost:8000/*" }, { urlPattern: "*localhost:54321/*" }, { urlPattern: "*publishub-production*" }] });
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: dsf, mobile: true });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }, { name: "prefers-reduced-motion", value: "reduce" }] });
  if (auth) await send("Page.addScriptToEvaluateOnNewDocument", { source: `try{localStorage.setItem('sb-localhost-auth-token', ${JSON.stringify(JSON.stringify(SESSION))});localStorage.setItem('ph_onboarded','1');localStorage.setItem('publishub.theme','dark')}catch(e){}` });
  const js = async (e) => { const r = await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }); return r.exceptionDetails ? "ERR " + r.exceptionDetails.exception?.description : r.result?.value; };
  const go = async (url, wait = 6000) => { await send("Page.navigate", { url }); await sleep(wait); };
  // clip in CSS px relative to the document
  const shot = async (file, clip) => {
    const params = { format: "png", captureBeyondViewport: true };
    if (clip) params.clip = { ...clip, scale: 1 };
    const r = await send("Page.captureScreenshot", params);
    writeFileSync(file, Buffer.from(r.data, "base64"));
  };
  const waitFor = async (expr, ms = 30000) => { for (let t = 0; t < ms; t += 400) { if (await js(expr) === true) return true; await sleep(400); } return false; };
  const close = async () => { ws.close(); await fetch(`http://127.0.0.1:9555/json/close/${target.id}`); };
  return { send, js, go, shot, close, errors, sleep, waitFor };
}
