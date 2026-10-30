const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const {
  generateFixture,
} = require("../scores-api/src/modules/padel-flash/domain");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [],
    state = { event: null, pairs: [], fixture: [], voted: false };
  const user = (rol) => ({
    id: 99,
    rol,
    nombre: "Prueba",
    email: "qa@example.com",
    numero_documento: "12345678",
  });
  async function pageFor(role, width = 390) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.setDefaultTimeout(12000);
    page.on("pageerror", (e) => errors.push(e.message));
    if (role)
      await page.addInitScript(
        (u) =>
          localStorage.setItem(
            "auth-storage-v2",
            JSON.stringify({
              state: { isAuthenticated: true, user: u },
              version: 0,
            }),
          ),
        user(role),
      );
    await page.route("**/*", async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        ep = url.pathname.replace(/^\/api/, "");
      if (url.pathname.startsWith("/uploads/padel/"))
        return route.fulfill({
          contentType: "image/png",
          body: require("node:fs").readFileSync(
            "scores-app/public/branding/escudo-club-union.png",
          ),
        });
      if (!url.pathname.startsWith("/api/"))
        return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
      let data = [],
        status = 200;
      const b =
        req.headers()["content-type"]?.includes("application/json") &&
        req.postData()
          ? req.postDataJSON()
          : {};
      if (ep.endsWith("/me")) data = role ? user(role) : null;
      if (ep === "/padel-flash") {
        if (req.method() === "POST")
          state.event = {
            ...b,
            id: 1,
            version: 0,
            publicado: 0,
            votacion: "pendiente",
          };
        data =
          req.method() === "GET"
            ? state.event
              ? [state.event]
              : []
            : { id: 1 };
      }
      if (ep === "/padel-flash/1")
        data = {
          event: state.event,
          pairs: state.pairs,
          fixture:
            state.event.publicado || role === "admin" ? state.fixture : [],
          voted: role ? false : state.voted,
          serverTime: Date.now(),
          ranking:
            state.event.votacion === "revelada"
              ? state.pairs.map((p, i) => ({ ...p, votos: i === 0 ? 1 : 0 }))
              : null,
        };
      if (ep === "/padel-flash/1/pairs") {
        state.pairs.push({ ...b, id: state.pairs.length + 1 });
        state.event.version++;
        data = { id: state.pairs.length };
      }
      if (/\/pairs\/\d+\/photo$/.test(ep)) {
        const id = Number(ep.split("/")[4]);
        state.pairs.find((p) => p.id === id).foto_url =
          `/uploads/padel/test-${id}.webp`;
        state.event.version++;
        data = {};
      }
      if (ep.endsWith("/draw")) {
        state.fixture = generateFixture(
          state.pairs.map((p) => p.id),
          state.event,
        ).map((m, i) => ({ ...m, id: i + 1, version: 0 }));
        state.event.version++;
        data = {};
      }
      if (ep.endsWith("/publish")) {
        state.event.publicado = 1;
        state.event.version++;
        data = {};
      }
      if (ep.endsWith("/voting")) {
        state.event.votacion = b.estado;
        state.event.version++;
        data = {};
      }
      if (ep.endsWith("/votes")) {
        if (state.voted) status = 409;
        state.voted = true;
        data = { voted: true };
      }
      if (ep.endsWith("/report"))
        data = {
          votes: [
            {
              id: 1,
              nombre: "Persona Prueba",
              telefono: "+573001234567",
              pareja_id: 1,
            },
          ],
          ranking:
            state.event.votacion === "cerrada"
              ? state.pairs.map((p, i) => ({ ...p, votos: i === 0 ? 1 : 0 }))
              : null,
          audit: [],
          next: null,
        };
      if (/\/matches\/\d+$/.test(ep)) {
        Object.assign(
          state.fixture.find((m) => m.id === Number(ep.split("/").at(-1))),
          b,
        );
        data = {};
      }
      return route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ ok: status === 200, data }),
      });
    });
    await page.goto("http://127.0.0.1:4173/padel/flash");
    return page;
  }
  try {
    const admin = await pageFor("admin");
    await admin
      .getByRole("button", { name: "Nuevo evento", exact: true })
      .click();
    let dialog = admin.getByRole("dialog");
    await dialog
      .getByRole("button", { name: "Crear evento", exact: true })
      .click();
    await dialog.waitFor({ state: "detached" });
    for (let i = 1; i <= 14; i++) {
      await admin
        .getByRole("button", { name: "Inscribir", exact: true })
        .click();
      dialog = admin.getByRole("dialog");
      await dialog.getByLabel("Jugador 1 · Nombre y apellido").fill(`Ana ${i}`);
      await dialog
        .getByLabel("Jugador 2 · Nombre y apellido")
        .fill(`Juan ${i}`);
      await dialog
        .getByLabel("Nombre del disfraz (opcional)")
        .fill(`Disfraz ${i}`);
      await dialog
        .getByRole("button", { name: "Guardar", exact: true })
        .click();
      await dialog.waitFor({ state: "detached" });
    }
    await admin.getByRole("button", { name: "Sorteo", exact: true }).click();
    await admin
      .getByRole("button", { name: "Sortear cruces", exact: true })
      .click();
    await admin
      .getByRole("button", { name: "Publicar cruces", exact: true })
      .click();
    await admin.getByRole("button", { name: "Confirmar", exact: true }).click();
    await admin
      .getByText("Sorteo publicado", { exact: true })
      .first()
      .waitFor();
    assert.equal(state.fixture.length, 14);
    await admin.getByRole("button", { name: "Disfraces", exact: true }).click();
    for (let i = 0; i < 14; i++) {
      await admin
        .locator("input[type=file]")
        .nth(i)
        .setInputFiles(
          path.resolve("scores-app/public/branding/escudo-club-union.png"),
        );
      await admin.waitForFunction(
        () => !document.querySelector("input[type=file]")?.disabled,
      );
    }
    await admin.getByRole("button", { name: "Gestión", exact: true }).click();
    await admin
      .getByRole("button", { name: "Abrir votación", exact: true })
      .click();
    await admin.getByRole("button", { name: "Confirmar", exact: true }).click();
    await admin
      .getByRole("button", { name: "Cerrar votación", exact: true })
      .waitFor();
    const guest = await pageFor(null, 320);
    await guest.getByRole("button", { name: "Disfraces", exact: true }).click();
    await guest.locator(".pf-photo img").first().scrollIntoViewIfNeeded();
    await guest.waitForFunction(
      () => document.querySelector(".pf-photo img")?.naturalWidth > 0,
    );
    assert.equal(
      await guest.getByRole("button", { name: "Gestión", exact: true }).count(),
      0,
    );
    await guest
      .getByRole("button", { name: "Elegir disfraz", exact: true })
      .first()
      .click();
    dialog = guest.getByRole("dialog");
    await dialog
      .getByLabel("Nombre y apellido", { exact: true })
      .fill("Persona Prueba");
    await dialog.getByLabel("Teléfono", { exact: true }).fill("3001234567");
    await dialog.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: "Confirmar mi voto" }).click();
    await dialog.waitFor({ state: "detached" });
    assert.equal(
      await guest
        .getByRole("button", { name: "Voto registrado", exact: true })
        .first()
        .isDisabled(),
      true,
    );
    await guest.reload();
    await guest.getByText("Tu voto está registrado", { exact: true }).waitFor();
    for (const width of [320, 390, 768, 1440]) {
      await guest.setViewportSize({ width, height: 900 });
      assert.equal(
        await guest.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `overflow ${width}`,
      );
      assert.equal(await guest.locator('img[src*="subcomite"]').count(), 0);
      if (width === 390)
        await guest.screenshot({
          path: path.join(os.tmpdir(), "padel-gallery-mobile.png"),
          fullPage: true,
        });
    }
    const judge = await pageFor("juez");
    await judge
      .getByRole("button", { name: "Registrar resultado" })
      .first()
      .click();
    dialog = judge.getByRole("dialog");
    await dialog.getByLabel("Set 1, pareja 1").fill("3");
    await dialog.getByLabel("Set 1, pareja 2").fill("2");
    await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
    await dialog.waitFor({ state: "detached" });
    await judge
      .getByText("Cierre por tiempo", { exact: true })
      .first()
      .waitFor();
    await judge.screenshot({
      path: path.join(os.tmpdir(), "padel-program-mobile.png"),
      fullPage: true,
    });
    await admin
      .getByRole("button", { name: "Cerrar votación", exact: true })
      .click();
    await admin.getByRole("button", { name: "Confirmar", exact: true }).click();
    await admin.getByRole("button", { name: "Consultar registro" }).click();
    await admin.getByRole("button", { name: "Revelar resultados" }).click();
    await admin.getByRole("button", { name: "Confirmar", exact: true }).click();
    await admin.getByText("Resultados publicados", { exact: true }).waitFor();
    await guest.reload();
    await guest.getByText("MEJOR DISFRAZ", { exact: true }).waitFor();
    assert.equal(
      await guest.getByText("+573001234567", { exact: true }).count(),
      0,
    );
    assert.deepEqual(errors, []);
    await guest.goto('http://127.0.0.1:4173/reglamento?deporte=padel');
    await guest.getByRole('heading', {name:'Reglamento interno · Torneo Flash'}).waitFor();
    assert.equal(await guest.locator('img[src*="subcomite"]').count(), 0);
    assert.equal(await guest.getByRole('link', {name:/PDF/}).count(), 0);
    await guest.getByText('20 minutos, hasta dos sets', {exact:true}).waitFor();
    for (const width of [320,390,1440]) {
      await guest.setViewportSize({width,height:900});
      assert.equal(await guest.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true,`reglamento overflow ${width}`);
    }
    await guest.getByRole('link',{name:'Tenis',exact:true}).last().click();
    await guest.getByRole('heading',{name:'Reglamento Oficial · Torneo Abierto de Dobles 2026'}).waitFor();
    await guest.getByRole('link',{name:'Abrir PDF',exact:true}).waitFor();
    await guest.goto('http://127.0.0.1:4173/padel');
    await guest.getByRole('heading',{name:'Formato Flash',exact:true}).waitFor();
    await guest.getByRole('heading',{name:'Torneos convencionales',exact:true}).waitFor();
    assert.equal(await guest.getByRole('button',{name:'Crear torneo de pádel'}).count(),0);
    await admin.goto('http://127.0.0.1:4173/padel');
    await admin.getByRole('button',{name:'Crear torneo de pádel'}).click();
    await admin.getByRole('link',{name:/Torneo convencional/}).click();
    const normalForm = admin.getByRole('dialog',{name:'Nuevo torneo',exact:true});
    await normalForm.waitFor();
    assert.equal(await normalForm.locator('[name="deporte"]').inputValue(),'padel');
    assert.equal(await normalForm.locator('[name="modalidad"]').inputValue(),'dobles');
    await admin.goto('http://127.0.0.1:4173/padel');
    await admin.getByRole('button',{name:'Crear torneo de pádel'}).click();
    await admin.getByRole('link',{name:/Torneo Flash/}).click();
    await admin.getByRole('dialog',{name:'Nuevo Flash de Pádel',exact:true}).waitFor();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: mobile event creation, 14 registrations, draw, publication, photos, vote, reload duplicate block, judge result, close and reveal; 320–1440px, no public PII or tennis logo",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
