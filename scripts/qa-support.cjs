const { chromium } = require(process.argv[2] || "playwright");
const assert = require("node:assert/strict");
const base = "http://127.0.0.1:4175";
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const role of ["juez", "admin"]) {
      for (const width of [360, 1366]) {
        const page = await browser.newPage({
          viewport: { width, height: 900 },
        });
        const errors = [],
          writes = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.addInitScript(
          (role) =>
            localStorage.setItem(
              "auth-storage-v2",
              JSON.stringify({
                state: {
                  isAuthenticated: true,
                  user: {
                    id: 3,
                    rol: role,
                    nombre: "Prueba",
                    apellido: "Local",
                    email: "test@example.com",
                    numero_documento: "12345678",
                  },
                },
                version: 0,
              }),
            ),
          role,
        );
        const ticket = {
          id: 7,
          asunto: "Consulta de cancha",
          mensaje: "Necesito ayuda con la cancha.",
          prioridad: "media",
          estado: "abierto",
          version: 0,
          autor: "Juez local",
          respuestas: [],
        };
        await page.route("**/*", (route) => {
          const url = new URL(route.request().url()),
            method = route.request().method();
          if (url.pathname.startsWith("/api/")) {
            let data = [];
            if (url.pathname === "/api/tickets") data = [ticket];
            if (url.pathname === "/api/tickets/7") data = ticket;
            if (url.pathname === "/api/notificaciones")
              data = {
                items: [
                  {
                    id: 1,
                    titulo: "Aviso de soporte",
                    mensaje: "Se registró tu solicitud",
                    link: role === "admin" ? "/admin/tickets" : "/soporte",
                    leido_at: null,
                  },
                ],
                pendientes: 1,
              };
            if (["POST", "PUT"].includes(method)) {
              writes.push({
                url: url.pathname,
                data: route.request().postDataJSON(),
              });
              data = { id: 7 };
            }
            return route.fulfill({
              contentType: "application/json",
              body: JSON.stringify({ ok: true, data }),
            });
          }
          return url.origin === base ? route.continue() : route.abort();
        });
        await page.goto(
          base + (role === "admin" ? "/admin/tickets" : "/soporte"),
        );
        await page.getByRole("button", { name: "Nueva solicitud" }).click();
        await page
          .getByLabel("Asunto", { exact: true })
          .fill("Prueba de envío");
        await page
          .getByLabel("¿Qué ocurrió?")
          .fill("Una prueba local, sin servicios externos.");
        await page.getByRole("button", { name: "Enviar solicitud" }).click();
        await page.getByRole("dialog").waitFor({ state: "hidden" });
        assert.ok(
          writes.find((w) => w.url === "/api/tickets" && w.data.request_id),
        );
        await page.getByRole("button", { name: /#7/ }).click();
        await page.getByRole("dialog").waitFor();
        if (role === "admin") {
          await page
            .getByLabel("Respuesta", { exact: true })
            .fill("Estamos revisando la solicitud.");
          await page.getByRole("button", { name: "Guardar respuesta" }).click();
          await page.getByRole("dialog").waitFor({ state: "hidden" });
          assert.equal(
            writes.find((w) => w.url.endsWith("/responder")).data.version,
            0,
          );
        } else {
          assert.equal(
            await page
              .getByRole("button", { name: "Guardar respuesta" })
              .count(),
            0,
          );
          await page.getByRole("button", { name: "Cerrar ventana" }).click();
        }
        await page.getByRole("button", { name: /Notificaciones/ }).click();
        await page.getByText("Aviso de soporte", { exact: false }).waitFor();
        await page
          .getByRole("button", { name: "Marcar todas como leídas" })
          .click();
        await page.getByRole("button", { name: "Cerrar ventana" }).click();
        if (role === "juez") {
          await page.getByRole("link", { name: "Ayuda", exact: true }).click();
          await page
            .getByRole("navigation", { name: "Navegación oficial" })
            .waitFor();
          assert.equal(
            await page.locator(".top-navigation-partner-logo").count(),
            0,
          );
          assert.equal(await page.locator('a[href="/sponsors"]').count(), 0);
        }
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `${role}: ancho ${width}`,
        );
        await page.screenshot({
          path: require("node:path").join(
            require("node:os").tmpdir(),
            `support-${role}-${width}.png`,
          ),
          fullPage: true,
        });
        assert.deepEqual(errors, []);
        console.log(`Soporte, campana y navegación OK: ${role} ${width}px`);
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
