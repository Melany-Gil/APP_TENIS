const { chromium } = require(process.argv[2] || "playwright");
const assert = require("node:assert/strict");
const base = "http://127.0.0.1:4175";
const pair = require("node:crypto").createECDH("prime256v1");
pair.generateKeys();
const publicKey = pair.getPublicKey().toString("base64url");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const width of [360, 1366]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } }),
        calls = [],
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript(() => {
        localStorage.setItem(
          "auth-storage-v2",
          JSON.stringify({
            state: {
              isAuthenticated: true,
              user: {
                id: 3,
                rol: "juez",
                nombre: "Prueba",
                apellido: "Local",
                email: "test@example.com",
                numero_documento: "12345678",
              },
            },
            version: 0,
          }),
        );
        let subscription = null;
        const reg = {
          pushManager: {
            getSubscription: async () => subscription,
            subscribe: async (options) => {
              subscription = {
                endpoint: "https://fcm.googleapis.com/fcm/send/qa-only",
                options,
                unsubscribe: async () => {
                  subscription = null;
                  return true;
                },
                toJSON: () => ({
                  endpoint: "https://fcm.googleapis.com/fcm/send/qa-only",
                  keys: { auth: "mock", p256dh: "mock" },
                }),
              };
              return subscription;
            },
          },
        };
        Object.defineProperty(navigator, "serviceWorker", {
          value: {
            getRegistration: async () => reg,
            register: async () => reg,
            ready: Promise.resolve(reg),
          },
        });
        Object.defineProperty(window, "PushManager", { value: function () {} });
        Object.defineProperty(Notification, "requestPermission", {
          value: async () => "granted",
        });
      });
      await page.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith("/api/")) {
          let data = [];
          if (url.pathname === "/api/notificaciones")
            data = { items: [], pendientes: 0 };
          if (url.pathname === "/api/push/config") data = { publicKey };
          if (route.request().method() === "POST") {
            calls.push(url.pathname);
            data = { enabled: true };
          }
          return route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({ ok: true, data }),
          });
        }
        return url.origin === base ? route.continue() : route.abort();
      });
      await page.goto(base + "/soporte");
      await page.getByRole("button", { name: /Notificaciones/ }).click();
      await page
        .getByRole("button", { name: "Activar push", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Desactivar push", exact: true })
        .waitFor();
      assert.ok(calls.includes("/api/push/subscribe"));
      await page.getByRole("button", { name: "Renovar activación" }).click();
      await page
        .getByRole("button", { name: "Desactivar push", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Activar push", exact: true })
        .waitFor();
      assert.ok(calls.includes("/api/push/unsubscribe"));
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      assert.deepEqual(errors, []);
      console.log(`Push opt-in, renovación y baja OK (simulados): ${width}px`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
