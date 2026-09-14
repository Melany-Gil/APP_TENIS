const { chromium } = require(process.argv[2] || "playwright"),
  assert = require("node:assert/strict");
const base = "http://127.0.0.1:4175";
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const width of [360, 768, 1366]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } }),
        errors = [];
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
                nombre: "QA",
                email: "qa@example.com",
                numero_documento: "1234567",
              },
            },
            version: 0,
          }),
        ),
      );
      const player = (id) => ({
        id,
        nombre: "Jugador " + id,
        apellido: "Apellido",
        foto: base + "/branding/subcomite-tenis-club-union.png",
      });
      const teams = [1, 2, 3].map((id) => ({
        equipo_id: id,
        nombre: "Apellido / Apellido " + id,
        categoria_id: 3,
        jugador1: player(id * 2),
        jugador2: player(id * 2 + 1),
        pj: 0,
        pg: 0,
        pp: 0,
      }));
      let distribution = {
          grupos: [{ categoria_id: 3, nombre: "Grupo 1", equipo_ids: [1, 2] }],
          parejas: [1, 2].map((equipo_id) => ({
            equipo_id,
            categoria_id: 3,
            grupo: "Grupo 1",
          })),
          incidencias: [],
        },
        writes = 0;
      const tournament = {
        id: 8,
        nombre: "Torneo local QA",
        modalidad: "dobles",
        sistema: "grupos_eliminacion",
        deporte: "tenis",
        estado: "proximo",
      };
      await page.route("**/*", (route) => {
        const u = new URL(route.request().url());
        if (u.pathname.startsWith("/api/")) {
          let data = [];
          if (u.pathname === "/api/torneos/8") data = tournament;
          if (u.pathname === "/api/categorias")
            data = [{ id: 3, nombre: "Cuarta", deporte: "tenis" }];
          if (u.pathname.endsWith("/grupos")) {
            if (route.request().method() === "PUT") {
              writes++;
              distribution.grupos = route.request().postDataJSON().grupos;
            }
            data = distribution;
          }
          if (u.pathname.endsWith("/inscripciones"))
            data = {
              total_parejas: 3,
              categorias: [
                { categoria_id: 3, categoria_nombre: "Cuarta", parejas: teams },
              ],
              inscripciones_raw: teams,
            };
          if (u.pathname.endsWith("/posiciones"))
            data = {
              modalidad: "dobles",
              grupos_explicitos: true,
              categorias: [
                {
                  id: 3,
                  nombre: "Cuarta",
                  grupos: [{ nombre: "Grupo 1", clave: "Cuarta · Grupo 1" }],
                },
              ],
              grupos: {
                "Cuarta · Grupo 1": teams
                  .slice(0, 2)
                  .map((t) => ({
                    id: t.equipo_id,
                    participante: t,
                    pj: 0,
                    pg: 0,
                    pp: 0,
                    puntos: 0,
                  })),
              },
              sin_grupo: [{ id: 3, participante: teams[2] }],
              incidencias: [],
            };
          if (u.pathname === "/api/notificaciones")
            data = { items: [], pendientes: 0 };
          return route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({ ok: true, data }),
          });
        }
        return u.origin === base ? route.continue() : route.abort();
      });
      await page.goto(base + "/torneo/8");
      await page
        .getByRole("button", { name: "Parejas inscritas", exact: true })
        .click();
      const select = page.getByRole("combobox", {
        name: "Grupo de Apellido / Apellido 3",
        exact: true,
      });
      await select.selectOption("0");
      await page
        .getByRole("button", { name: "Guardar grupos", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Guardar grupos", exact: true })
        .waitFor({ state: "hidden" });
      assert.equal(writes, 1);
      assert.deepEqual(distribution.grupos[0].equipo_ids, [1, 2, 3]);
      assert.ok(
        (await page.locator('img[alt^="Foto de Jugador"]').count()) >= 6,
      );
      await page.getByText('Crear un grupo', { exact: true }).click();
      await page.getByLabel('Categoría del nuevo grupo').selectOption('3');
      await page.getByLabel('Sistema de numeración').selectOption('letters');
      const addGroup = page.getByRole('button', { name: 'Añadir grupo', exact: true });
      assert.equal(await addGroup.isEnabled(), true);
      await addGroup.click();
      await page.getByRole('button', { name: 'Guardar grupos', exact: true }).click();
      await page.getByRole('button', { name: 'Guardar grupos', exact: true }).waitFor({ state: 'hidden' });
      assert.ok(distribution.grupos.some(g => g.nombre === 'GRUPO A'));
      await page
        .getByRole("button", { name: "Posiciones", exact: true })
        .click();
      await page
        .getByRole("combobox", { name: "Categoría de posiciones" })
        .waitFor();
      await page
        .getByText("1 parejas aún sin grupo", { exact: true })
        .waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      await page.screenshot({
        path: require("node:path").join(
          require("node:os").tmpdir(),
          `groups-${width}.png`,
        ),
        fullPage: true,
      });
      assert.deepEqual(errors, []);
      console.log(`Grupos, guardado, fotos dobles y posiciones OK: ${width}px`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
