// Browser regression with intercepted API calls only. Never touches a database.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    await checkJudgeGate(browser);
    for (const role of ["miembro", "juez", "admin", "caddie"]) {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const user = {
        id: role === "caddie" ? 7 : 11,
        rol: role === "caddie" ? "miembro" : role,
        nombre: "Usuario",
        apellido: "QA",
        email: "qa@example.com",
        numero_documento: "12345678",
      };
      let responded = false,
        assignment = 7,
        granted = false,
        writes = 0,
        fail = false;
      const review = {
        atencion: 5,
        colaboracion: 4,
        trato: 5,
        comentario: "Excelente atención",
      };
      await page.addInitScript(
        (u) =>
          localStorage.setItem(
            "auth-storage-v2",
            JSON.stringify({
              state: { isAuthenticated: true, user: u },
              version: 0,
            }),
          ),
        user,
      );
      await page.route("**/*", async (route) => {
        const req = route.request(),
          url = new URL(req.url()),
          ep = url.pathname.replace(/^\/api/, "");
        if (!url.pathname.startsWith("/api/"))
          return url.hostname === "127.0.0.1"
            ? route.continue()
            : route.abort();
        const reply = (data, status = 200) =>
          route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify(
              status === 200
                ? { ok: true, data }
                : { ok: false, message: "Fallo simulado; vuelve a intentarlo" },
            ),
          });
        if (req.method() !== "GET") {
          if (fail) return reply(null, 500);
          writes++;
          if (ep.endsWith("/evaluacion")) {
            assert.deepEqual(req.postDataJSON(), { ...review, version: 1 });
            responded = true;
          } else if (ep.endsWith("/rol")) granted = req.postDataJSON().activo;
          else if (ep === "/caddies/partidos/30")
            assignment = req.postDataJSON().caddie_id;
          else throw new Error(`Unexpected write ${ep}`);
          return reply({});
        }
        if (ep.endsWith("/me")) return reply(user);
        if (ep === "/caddies/contexto")
          return reply({
            caddie: role === "caddie",
            jugador: role === "miembro",
            gestion: ["admin", "juez"].includes(role),
          });
        if (ep === "/caddies/mis-partidos")
          return reply([
            {
              id: 30,
              estado: "finalizado",
              caddie_id: 7,
              respuestas: role === "caddie" ? 1 : 0,
              respondida: responded ? 1 : 0,
              participante1: "Pinto / Dueñas",
              participante2: "Pacheco / Suárez",
            },
          ]);
        if (ep === "/caddies")
          return reply([
            { id: 7, nombre: "Caddie", apellido: "Uno" },
            { id: 8, nombre: "Caddie", apellido: "Dos" },
            ...(granted ? [{ id: 11, nombre: "Usuario", apellido: "QA" }] : []),
          ]);
        if (ep === "/users") return reply([user]);
        if (ep === "/caddies/partidos/30")
          return reply({
            partido_id: 30,
            version: 1,
            caddie: {
              id: assignment,
              nombre: assignment === 7 ? "Caddie Uno" : "Caddie Dos",
            },
            puede_asignar: ["juez", "admin"].includes(role),
            puede_evaluar: role === "miembro" && !responded,
            respondida: responded,
            evaluaciones: responded || role === "caddie" ? [review] : [],
          });
        return reply([]);
      });
      await page.goto("http://127.0.0.1:4173/caddies");
      await page
        .getByRole("button", { name: "Ver partido 30", exact: true })
        .click();
      await page.getByText("Caddie Uno", { exact: true }).first().waitFor();
      if (role === "miembro") {
        for (const [label, value] of [
          ["Atención", "5"],
          ["Colaboración", "4"],
          ["Trato", "5"],
        ]) {
          const group = page.getByRole("group", { name: label, exact: true });
          await group.getByText(value, { exact: true }).click();
          assert.equal(
            await group
              .getByRole("radio", { name: value, exact: true })
              .isChecked(),
            true,
          );
        }
        await page.getByLabel("Comentario (opcional)").fill(review.comentario);
        fail = true;
        await page.getByRole("button", { name: "Enviar evaluación" }).click();
        await page.getByRole("alert").waitFor();
        assert.equal(
          await page.getByLabel("Comentario (opcional)").inputValue(),
          review.comentario,
        );
        fail = false;
        await page.getByRole("button", { name: "Enviar evaluación" }).click();
        await page
          .getByText("Ya registraste tu evaluación para este partido.")
          .waitFor();
        assert.equal(writes, 1);
      } else if (role === "juez") {
        await page
          .getByRole("combobox", { name: /^Asignación/ })
          .selectOption("8");
        await page.getByLabel("Motivo del cambio").fill("Cambio de turno");
        await page.getByRole("button", { name: "Guardar asignación" }).click();
        await page.getByText("Caddie Dos", { exact: true }).first().waitFor();
        assert.equal(writes, 1);
      } else if (role === "admin") {
        await page
          .getByText("Administrar roles y jugadores", { exact: true })
          .click();
        await page
          .getByRole("combobox", { name: /^Cuenta/ })
          .selectOption("11");
        await page
          .getByRole("button", { name: "Habilitar rol de caddie" })
          .click();
        await page
          .getByRole("button", { name: "Deshabilitar rol de caddie" })
          .waitFor();
        assert.equal(granted, true);
      } else {
        await page
          .getByText(`“${review.comentario}”`, { exact: true })
          .waitFor();
        assert.equal(
          await page.getByRole("button", { name: "Enviar evaluación" }).count(),
          0,
        );
      }
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `${role}: fits ${width}px`,
        );
      }
      if (role === "caddie") {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({
          path: path.join(os.tmpdir(), "caddies-mobile-qa.png"),
          fullPage: true,
        });
      }
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`PASS ${role}: caddie workflow and responsive layout`);
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

async function checkJudgeGate(browser) {
  const {
    createInitialState,
    serializeState,
  } = require("../scores-api/src/modules/matches/score.engine");
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const user = {
    id: 5,
    rol: "juez",
    nombre: "Juez",
    apellido: "QA",
    email: "qa@example.com",
    numero_documento: "12345678",
  };
  const m = {
    id: 30,
    juez_id: 5,
    modalidad: "individual",
    estado: "programado",
    jugador1: { nombre: "Carlos", apellido: "Rodríguez" },
    jugador2: { nombre: "Andrés", apellido: "Martínez" },
    formato: { mejor_de_sets: 3, juegos_por_set: 6 },
  };
  let assigned = false,
    starts = 0;
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(
    (u) =>
      localStorage.setItem(
        "auth-storage-v2",
        JSON.stringify({
          state: { isAuthenticated: true, user: u },
          version: 0,
        }),
      ),
    user,
  );
  await page.route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      ep = url.pathname.replace(/^\/api/, "");
    if (!url.pathname.startsWith("/api/"))
      return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
    const control = () => ({
      partido: m,
      marcador: serializeState(createInitialState()),
      revision: "0:0",
      configuration: "fixture",
      eventos_recientes: [],
      en_vivo:
        m.estado === "programado"
          ? null
          : { iniciado_at: new Date().toISOString(), pausado_at: null },
    });
    let data = {};
    if (ep.endsWith("/me")) data = user;
    else if (ep === "/partidos/gestion/mis-partidos") data = [m];
    else if (ep === "/partidos/30/control") data = control();
    else if (ep === "/caddies")
      data = [{ id: 7, nombre: "Caddie", apellido: "QA" }];
    else if (ep === "/caddies/partidos/30") {
      if (req.method() === "PUT") {
        assigned = true;
        assert.equal(req.postDataJSON().caddie_id, 7);
      }
      data = {
        version: assigned ? 1 : 0,
        caddie: assigned ? { id: 7, nombre: "Caddie QA" } : null,
        puede_asignar: true,
        evaluaciones: [],
      };
    } else if (ep === "/partidos/30/iniciar") {
      assert.equal(assigned, true, "No start call before caddie assignment");
      starts++;
      m.estado = "en_vivo";
      data = control();
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ok: true, data }),
    });
  });
  try {
    await page.goto("http://127.0.0.1:4173/juez");
    await page
      .getByRole("button", { name: /Carlos Rodríguez.*Andrés Martínez/ })
      .click();
    const start = page.getByRole("button", {
      name: "Iniciar partido",
      exact: true,
    });
    await start.waitFor();
    assert.equal(await start.isDisabled(), true);
    const modal = page.getByRole("dialog", {
      name: "Caddie del partido",
      exact: true,
    });
    await modal.waitFor();
    await modal.getByRole("button", { name: "Cerrar modal" }).click();
    await modal.waitFor({ state: "detached" });
    assert.equal(await start.isDisabled(), true);
    await page
      .getByRole("button", { name: "Asignar caddie obligatorio" })
      .click();
    await modal
      .getByRole("combobox", { name: /^Asignación/ })
      .selectOption("7");
    await modal.getByRole("button", { name: "Guardar asignación" }).click();
    await modal.getByText("Caddie QA", { exact: true }).first().waitFor();
    await modal.getByRole("button", { name: "Cerrar modal" }).click();
    await page.waitForFunction(() =>
      [...document.querySelectorAll("button")].some(
        (b) => b.textContent.includes("Iniciar partido") && !b.disabled,
      ),
    );
    await start.click();
    await page.locator(".judge-point").first().waitFor();
    assert.equal(starts, 1);
    assert.deepEqual(errors, []);
    console.log("PASS judge: mandatory caddie assignment before match start");
  } finally {
    await page.close();
  }
}
