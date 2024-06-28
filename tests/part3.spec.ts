import { Page, expect, test } from "@playwright/test";

async function addNewItem(
  page: Page,
  name: string,
  price: string,
  imageUrl?: string
) {
  await page.locator("#item-name-input").fill(name);
  await page.locator("#item-price-input").fill(price);
  if (imageUrl) await page.locator("#item-image-url-input").fill(imageUrl);
}

// bleh https://github.com/microsoft/playwright/issues/6046#issuecomment-1757704069
async function waitForImagesToLoad(page: Page) {
  await page.waitForFunction(() => {
    const images = Array.from(document.querySelectorAll("img"));
    return images.every((img) => img.complete);
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/part3/index.html");
});

test(
  "No elements are added if the form is missing values.",
  {
    annotation: {
      type: "points",
      description: "0.5",
    },
  },
  async ({ page }) => {
    await page.locator("#add-item").click();

    expect(await page.locator("#items .shopping-list-item").count()).toBe(0);

    await page.locator("#item-name-input").fill("Raspberries");

    await page.locator("#add-item").click();

    expect(await page.locator("#items .shopping-list-item").count()).toBe(0);

    await page.locator("#item-price-input").fill("2.30");
    await page.locator("#item-name-input").fill("");

    await page.locator("#add-item").click();

    expect(await page.locator("#items .shopping-list-item").count()).toBe(0);

    await page.locator("#item-name-input").fill("Raspberries");

    await page.locator("#add-item").click();

    // We test this here so you don't *start* by getting points
    expect(await page.locator("#items .shopping-list-item").count()).toBe(1);
  }
);

test(
  "New elements are added correctly (single).",
  {
    annotation: {
      type: "points",
      description: "0.5",
    },
  },
  async ({ page }) => {
    await addNewItem(
      page,
      "Raspberries",
      "2.30",
      "https://picsum.photos/id/429/350/350"
    );

    await page.locator("#add-item").click();

    expect(await page.locator("#items .shopping-list-item").count()).toBe(1);

    const item = page.locator("#items .shopping-list-item");

    expect(item).toContainText("Raspberries");
    expect(item).toContainText("2.3");

    await waitForImagesToLoad(page);
  }
);

test(
  "New elements are added correctly (multiple).",
  {
    annotation: {
      type: "points",
      description: "1",
    },
  },
  async ({ page }) => {
    await addNewItem(
      page,
      "Raspberries",
      "2.30",
      "https://picsum.photos/id/429/350/350"
    );

    await page.locator("#add-item").click();

    expect(await page.locator("#item-name-input").inputValue()).toBe("");
    expect(await page.locator("#item-price-input").inputValue()).toBe("");
    expect(await page.locator("#item-image-url-input").inputValue()).toBe("");

    await addNewItem(
      page,
      "Banana",
      "10",
      "https://upload.wikimedia.org/wikipedia/commons/4/4c/Bananas.jpg"
    );

    await page.locator("#add-item").click();

    expect(await page.locator("#items .shopping-list-item").count()).toBe(2);

    const item = page.locator("#items .shopping-list-item");

    // fine to expect order i think
    expect(item.first()).toContainText("Raspberries");
    expect(item.first()).toContainText("2.3");

    expect(item.last()).toContainText("Banana");
    expect(item.last()).toContainText("10");

    await waitForImagesToLoad(page);
  }
);

test(
  "Handlebars is used in element creation.",
  {
    annotation: {
      type: "points",
      description: "1",
    },
  },
  async ({ page }) => {
    await page.route("/part3/handlebars.js", async (route) => {
      const res = await route.fetch();
      const handlebars = await res.text();

      // I don't thiink this will break anything observable
      const shimmedHandlebars = `${handlebars}
        const tmpHandlebarsCompile = Handlebars.compile;
        Handlebars.compile = function() {
          Handlebars.__compiles = Handlebars.__compiles || 0;
          Handlebars.__compiles++;

          const template = tmpHandlebarsCompile.apply(this, arguments);

          return function() {
            Handlebars.__executes = Handlebars.__executes || 0;
            Handlebars.__executes++;

            return template.apply(this, arguments);
          };
        }
      `;

      route.fulfill({
        status: 200,
        body: shimmedHandlebars,
      });
    });

    await page.goto("/part3/index.html");

    await addNewItem(
      page,
      "Raspberries",
      "2.30",
      "https://picsum.photos/id/429/350/350"
    );

    await page.locator("#add-item").click();

    const handlebarsRuns = await page.evaluate(() => {
      return {
        // @ts-ignore
        compiles: Handlebars.__compiles,
        // @ts-ignore
        executes: Handlebars.__executes,
      };
    });

    expect(handlebarsRuns.compiles).toBeGreaterThanOrEqual(1);
    expect(handlebarsRuns.executes).toBeGreaterThanOrEqual(1);

    await addNewItem(
      page,
      "Banana",
      "10",
      "https://upload.wikimedia.org/wikipedia/commons/4/4c/Bananas.jpg"
    );

    await page.locator("#add-item").click();

    const handlebarsRuns2 = await page.evaluate(() => {
      return {
        // @ts-ignore
        compiles: Handlebars.__compiles,
        // @ts-ignore
        executes: Handlebars.__executes,
      };
    });

    // no need to re-compile, but:
    expect(handlebarsRuns2.compiles).toBeGreaterThanOrEqual(1);
    // should run again! doesn't have to be the same template, in theory
    expect(handlebarsRuns2.executes).toBeGreaterThanOrEqual(2);

    await waitForImagesToLoad(page);
  }
);

test(
  "The <img> tag is rendered when it should be.",
  {
    annotation: {
      type: "points",
      description: "1",
    },
  },
  async ({ page }) => {
    await addNewItem(
      page,
      "Raspberries",
      "2.30",
      "https://picsum.photos/id/429/350/350"
    );

    await page.locator("#add-item").click();

    const itemImage = page.locator("#items .shopping-list-item img");

    await waitForImagesToLoad(page);

    expect(itemImage).toBeVisible();

    expect(itemImage).toHaveAttribute(
      "src",
      "https://picsum.photos/id/429/350/350"
    );
  }
);

test(
  "The <img> tag is not rendered when it shouldn't be.",
  {
    annotation: {
      type: "points",
      description: "1",
    },
  },
  async ({ page }) => {
    await addNewItem(page, "Raspberries", "2.30");

    await page.locator("#add-item").click();

    await waitForImagesToLoad(page);

    expect(await page.locator("#items .shopping-list-item").count()).toBe(1);
    const imageCount = await page
      .locator("#items .shopping-list-item img")
      .count();

    expect(imageCount).toBe(0);
  }
);

test(
  "Elements are persisted on reload.",
  {
    annotation: {
      type: "points",
      description: "1",
    },
  },
  async ({ page }) => {
    await addNewItem(
      page,
      "Raspberries",
      "2.30",
      "https://picsum.photos/id/429/350/350"
    );

    await page.locator("#add-item").click();

    await addNewItem(
      page,
      "Banana",
      "10",
      "https://upload.wikimedia.org/wikipedia/commons/4/4c/Bananas.jpg"
    );

    await page.locator("#add-item").click();

    await page.reload();

    expect(await page.locator("#items .shopping-list-item").count()).toBe(2);

    const items = page.locator("#items .shopping-list-item");

    expect(items.first()).toContainText("Raspberries");
    expect(items.first()).toContainText("2.3");

    expect(items.last()).toContainText("Banana");
    expect(items.last()).toContainText("10");

    await addNewItem(
      page,
      "Computer",
      "1200",
      "https://picsum.photos/id/0/300/300"
    );

    await page.locator("#add-item").click();

    expect(await page.locator("#items .shopping-list-item").count()).toBe(3);

    expect(page.locator("#items .shopping-list-item").last()).toContainText(
      "Computer"
    );
  }
);

test(
  "Elements persisted on reload can be cleared.",
  {
    annotation: {
      type: "points",
      description: "1",
    },
  },
  async ({ page }) => {
    await addNewItem(
      page,
      "Raspberries",
      "2.30",
      "https://picsum.photos/id/429/350/350"
    );

    await page.locator("#add-item").click();

    await addNewItem(
      page,
      "Banana",
      "10",
      "https://upload.wikimedia.org/wikipedia/commons/4/4c/Bananas.jpg"
    );

    await page.locator("#add-item").click();

    await page.reload();

    expect(await page.locator("#items .shopping-list-item").count()).toBe(2);

    await page.locator("#clear-button").click();

    expect(await page.locator("#items .shopping-list-item").count()).toBe(0);

    await page.reload();

    expect(await page.locator("#items .shopping-list-item").count()).toBe(0);

    await addNewItem(
      page,
      "Computer",
      "1200",
      "https://picsum.photos/id/0/300/300"
    );

    await page.locator("#add-item").click();

    expect(await page.locator("#items .shopping-list-item").count()).toBe(1);

    expect(page.locator("#items .shopping-list-item").last()).toContainText(
      "Computer"
    );
  }
);
