const { chromium } = require(process.argv[2] || "playwright"),
  assert = require("node:assert/strict");
const base = "http://127.0.0.1:4175";
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const width of [360, 768, 1366]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } }),
        errors = [],
        posts = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript(() =>
        localStorage.setItem(
          "auth-storage-v2",
          JSON.stringify({
            state: {
              isAuthenticated: true,
              user: {
                id: 3,
                rol: "admin",
                nombre: "Prueba",
                apellido: "Local",
                email: "test@example.com",
                numero_documento: "12345678",
              },
            },
            version: 0,
          }),
        ),
      );
      const tournament = {
        id: 8,
        nombre: "Torneo de prueba",
        deporte: "tenis",
        modalidad: "dobles",
        sistema: "grupos_eliminacion",
        estado: "proximo",
        partidos_count: 0,
        inscripciones_count: 0,
      };
      await page.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith("/api/")) {
          let data = [];
          if (url.pathname === "/api/notificaciones")
            data = { items: [], pendientes: 0 };
          if (url.pathname === "/api/torneos") data = [tournament];
          if (url.pathname === "/api/torneos/8") data = tournament;
          if (url.pathname.endsWith("/inscripciones"))
            data = { total_parejas: 0, categorias: [], inscripciones_raw: [] };
          if (url.pathname.endsWith("/posiciones"))
            data = {
              nombres_grupos: ["Quinta · A"],
              grupos: {
                "Quinta · A": [
                  {
                    id: 2,
                    participante: { nombre: "Pérez / García" },
                    pj: 1,
                    pg: 1,
                    pp: 0,
                    puntos: 2,
                  },
                ],
              },
            };
          if (url.pathname === "/api/equipos")
            data = [
              {
                id: 2,
                nombre: "Pérez / García",
                activo: true,
                categoria: { id: 1, nombre: "Quinta" },
                jugador1: { nombre: "Ana" },
                jugador2: { nombre: "Luis" },
              },
            ];
          if (route.request().method() === "POST")
            posts.push(route.request().postDataJSON());
          return route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({ ok: true, data }),
          });
        }
        return url.origin === base ? route.continue() : route.abort();
      });
      await page.goto(base + "/tennis");
      if (width < 768) {
        assert.ok(
          (await page
            .locator(".app-header")
            .evaluate((e) => e.getBoundingClientRect().height)) < 90,
        );
        await page
          .getByRole("button", { name: "Abrir menú de navegación" })
          .click();
        await page
          .getByRole("navigation", { name: "Navegación móvil" })
          .getByRole("link", { name: "Tenis", exact: true })
          .click();
        assert.equal(await page.getByRole("dialog").count(), 0);
      }
      await page.getByRole("button", { name: "Torneos", exact: true }).click();
      await page.getByRole("link", { name: /Torneo de prueba/ }).click();
      await page.getByRole("button", { name: "Parejas inscritas" }).click();
      await page.getByRole("button", { name: "Agregar parejas" }).click();
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Inscribir 1 parejas" }).click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      assert.deepEqual(posts[0], { equipo_ids: [2] });
      await page
        .getByRole("button", { name: "Posiciones", exact: true })
        .click();
      await page.getByRole("cell", { name: "2", exact: true }).waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      assert.equal(await page.locator(".tennis-atmosphere").count(), 1);
      await page.screenshot({
        path: require("node:path").join(
          require("node:os").tmpdir(),
          `tournament-${width}.png`,
        ),
        fullPage: true,
      });
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(
        await page
          .locator(".tennis-atmosphere-ball")
          .evaluate((e) => getComputedStyle(e).animationName),
        "none",
      );
      assert.deepEqual(errors, []);
      if (width === 360) {
        await page.goto(base + "/juez/perfil");
        await page.getByRole("button", { name: "Abrir menú del juez" }).click();
        await page.getByRole("dialog").getByRole("link", { name: "Mi perfil", exact: true }).click();
        await page.getByRole("dialog").waitFor({ state: "hidden" });
        assert.ok((await page.locator(".app-header").evaluate(e => e.getBoundingClientRect().height)) < 90);
        assert.equal(await page.locator(".tennis-atmosphere").count(), 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      }
      console.log(`Torneo, inscripciones, menú y fondo OK: ${width}px`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
