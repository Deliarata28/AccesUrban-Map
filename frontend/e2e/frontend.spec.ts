import { test, expect, type Locator, type Page } from "@playwright/test";

const adminEmail = "accesurbanmap@gmail.com";
async function login(
  page: Page,
  email = adminEmail,
  password = "accesurbanmap123",
) {
  await page.goto("/conectare");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(email === adminEmail ? /\/admin/ : /\/home/);
}

async function chooseOption(
  container: Page | Locator,
  id: string,
  label: string,
) {
  await container.locator(`#${id}`).click();
  await container.getByRole("option", { name: label, exact: true }).click();
}

test("guest guard and administrator place create/edit/delete survive reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Conectează-te pentru administrare" }),
  ).toBeVisible();
  await login(page);
  await expect(page.locator(".access-donut")).toBeVisible();
  await page
    .getByRole("navigation", { name: "Dashboard" })
    .getByRole("link", { name: "Date", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Adaugă locație", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Nume", { exact: true })
    .fill("Centru de test accesibil");
  await dialog
    .getByLabel("Adresă", { exact: true })
    .fill("Strada de test 10, Chișinău");
  await dialog
    .getByLabel("Descriere", { exact: true })
    .fill("Intrarea laterală este liberă, iar accesul se face fără trepte.");
  await chooseOption(dialog, "facility-rampa", "Da");
  await chooseOption(dialog, "facility-intrareFaraTrepte", "Da");
  await dialog.getByRole("button", { name: "Salvează intrarea" }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("textbox", { name: "Caută în catalog" })
    .fill("Centru de test");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("45/100");
  await page
    .getByRole("button", { name: "Editează Centru de test accesibil" })
    .click();
  await chooseOption(dialog, "facility-lift", "Da");
  await dialog.getByRole("button", { name: "Salvează intrarea" }).click();
  await expect(page.locator("tbody tr")).toContainText("60/100");
  await page.reload();
  await page
    .getByRole("textbox", { name: "Caută în catalog" })
    .fill("Centru de test");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("link", { name: "Vezi pe hartă Centru de test accesibil" })
    .click();
  await expect(page.locator(".place-detail-title h3")).toHaveText(
    "Centru de test accesibil",
  );
  await page.goto("/admin?tab=places");
  await page
    .getByRole("textbox", { name: "Caută în catalog" })
    .fill("Centru de test");
  await page
    .getByRole("button", { name: "Șterge Centru de test accesibil" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Șterge intrarea", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("user report with photo reaches admin and receives a rejection explanation", async ({
  page,
}) => {
  await page.goto("/home");
  // Fixtures enter through the same public store registration API; login and reports use the actual UI.
  await page.evaluate(async () => {
    const store = await import(/* @vite-ignore */ "/src/stores/authStore.ts");
    store.registerMockUser({
      name: "Elena Test",
      email: "elena@example.test",
      password: "testing123",
      accessibilityProfile: "WHEELCHAIR",
    });
  });
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Acces pentru administrator" }),
  ).toBeVisible();
  await page.goto("/map?place=usm");
  await page.getByRole("button", { name: "Raportează o problemă" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Descriere", { exact: true })
    .fill("Pe rampă este parcat un automobil albastru.");
  await dialog
    .locator('input[type="file"]')
    .setInputFiles({
      name: "rampa.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE1cAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await expect(
    dialog.getByAltText("Fotografia problemei selectate"),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Trimite raportul" }).click();
  await expect(
    dialog.getByRole("heading", { name: "Raportul a fost înregistrat" }),
  ).toBeVisible();
  await dialog.getByRole("link", { name: "Rapoartele mele" }).click();
  await expect(page.locator(".my-report")).toHaveCount(1);
  await expect(page.locator(".my-report")).toContainText("În așteptare");
  await page.getByRole("button", { name: "Deconectare", exact: true }).click();
  await login(page);
  await page.goto("/admin?tab=reports");
  const row = page.locator("tbody tr").filter({ hasText: "Elena Test" });
  await row.getByRole("button", { name: "Verifică" }).click();
  await expect(
    page.getByRole("dialog").locator(".review-photo img"),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Respinge raportul" })
    .click();
  await expect(page.getByRole("alert")).toContainText("motivul");
  await page
    .locator("#moderator-note")
    .fill(
      "Imaginea nu permite confirmarea locației. Te rugăm să adaugi detalii.",
    );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Respinge raportul" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Deconectare administrator" }).click();
  await login(page, "elena@example.test", "testing123");
  await page.goto("/rapoartele-mele");
  await expect(page.locator(".my-report")).toContainText("Respins");
  await expect(page.locator(".moderator-note")).toContainText(
    "Imaginea nu permite confirmarea",
  );
  await page.reload();
  await expect(page.locator(".my-report img")).toBeVisible();
});
test("map filters, search, route alternatives and close clear all selections", async ({
  page,
}) => {
  await page.goto("/map");
  await page.getByRole("button", { name: "Filtre de accesibilitate" }).click();
  await chooseOption(page, "map-category", "Muzeu");
  await page.getByLabel("Rampă", { exact: true }).check();
  await page.getByRole("button", { name: "Vezi locațiile" }).click();
  await expect(page.locator(".map-place-list-item").first()).toBeVisible();
  const search = page.getByRole("combobox", {
    name: "Caută locație",
    exact: true,
  });
  await search.fill("usm");
  await page
    .getByRole("option")
    .filter({ hasText: "Universitatea de Stat" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Planifică traseul" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Destinație", exact: true }),
  ).toHaveValue("Universitatea de Stat din Moldova");
  await page
    .getByRole("combobox", { name: "Punct de plecare", exact: true })
    .fill("utm");
  await page
    .getByRole("option")
    .filter({ hasText: "Universitatea Tehnică" })
    .click();
  await expect(page.locator(".route-variants button").first()).toBeVisible();
  await expect(page.getByText("Distanță estimată")).toBeVisible();
  await expect(page.getByText("Durată estimată")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Viraje și avertizări" }),
  ).toBeVisible();
  await expect(page.locator(".route-alert-marker")).toHaveCount(0);
  await chooseOption(page, "route-mode", "Cu mașina");
  await expect(page.getByRole("button", { name: "Centrează harta" })).toBeVisible();
  await expect(page.locator(".parking-marker")).toHaveCount(12);
  await page.getByRole("button", { name: "Închide și șterge traseul" }).click();
  await expect(page.locator(".urban-map-panel")).not.toBeVisible();
  await expect(search).toHaveValue("");
  await page.getByRole("button", { name: "Deschide traseul" }).click();
  await expect(
    page.getByRole("combobox", { name: "Destinație", exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("combobox", { name: "Punct de plecare", exact: true }),
  ).toHaveValue("");
});
test("mobile dashboard and modal stay within viewport and support Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await expect(page.locator(".access-donut")).toBeVisible();
  expect(
    await page
      .locator("html")
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  await page.screenshot({
    path: ".artifacts/admin-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Deschide meniul" }).click();
  await page
    .getByRole("navigation", { name: "Dashboard" })
    .getByRole("link", { name: "Date", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Adaugă locație", exact: true })
    .click();
  const box = await page.getByRole("dialog").boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.width).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/map?place=usm");
  await expect(page.locator(".place-detail-title")).toBeVisible();
  expect(
    await page
      .locator("html")
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: ".artifacts/map-mobile.png", fullPage: true });
});
