import { Locator, Page, expect, test } from "@playwright/test";

const ensureOnlyBubbles = async (page: Page) => {
  const bubblesCount = await page.locator(".shape-container > .circle").count();
  const elementsCount = await page.locator(".shape-container > *").count();
  expect(
    bubblesCount,
    `Expected only bubbles to be present in the shape container, but found ${elementsCount} elements`
  ).toBe(elementsCount);
};

const ensureBubbleCount = async (page: Page, count: number) => {
  const bubblesCount = await page.locator(".shape-container > .circle").count();
  expect(
    bubblesCount,
    `Expected ${count} bubbles to be present in the shape container, but found ${bubblesCount} bubbles`
  ).toBe(count);
};

const expectBubbleStartState = async (page: Page) => {
  await ensureOnlyBubbles(page);
  await ensureBubbleCount(page, 26);
};

const getBubbleSnapshot = async (page: Page) => {
  await ensureOnlyBubbles(page);

  const bubbles = await page.locator(".shape-container > .circle").all();

  const bubbleMap = new Map<number, string[]>();

  for (const bubble of bubbles) {
    const bubbleId = await bubble.evaluate((node) => {
      // @ts-ignore
      if (!window.__autograder_bubbleMap) {
        // @ts-ignore
        window.__autograder_bubbleMap = new Map();
      }
      // @ts-ignore
      const bubbleMap = window.__autograder_bubbleMap;

      // @ts-ignore
      if (window.__autograder_nextBubbleId === undefined) {
        // @ts-ignore
        window.__autograder_nextBubbleId = 0;
      }

      if (!bubbleMap.has(node)) {
        // @ts-ignore
        bubbleMap.set(node, window.__autograder_nextBubbleId++);
      }

      return bubbleMap.get(node);
    });

    // don't accept visibility: hidden
    // const isVisible = bubble.isVisible();
    const isVisible = await bubble.evaluate((node) => {
      return window.getComputedStyle(node).display !== "none";
    });

    const classList = await bubble.evaluate((node) => {
      return [...node.classList];
    });

    if (isVisible) {
      bubbleMap.set(bubbleId, classList);
    }
  }

  return bubbleMap;
};

const expectPageHasRemovedBubbleColorsFromSnapshot = async (
  page: Page,
  beforeSnapshot: Map<number, string[]>,
  colors: string[]
) => {
  const ids: number[] = [];

  for (const [bubbleId, bubbleClasses] of beforeSnapshot.entries()) {
    const colorClasses = bubbleClasses.filter((cls: string) =>
      ["red", "orange", "yellow", "green", "blue", "purple"].includes(cls)
    );

    const shouldBeRemoved = colorClasses.some((cls: string) =>
      colors.includes(cls)
    );

    if (shouldBeRemoved) {
      ids.push(bubbleId);
    }
  }

  await expectPageHasRemovedBubblesFromSnapshot(page, beforeSnapshot, ids);
};

const expectPageHasRemovedBubblesFromSnapshot = async (
  page: Page,
  beforeSnapshot: Map<number, string[]>,
  bubbleIds: number[]
) => {
  const afterSnapshot = await getBubbleSnapshot(page);

  for (const bubbleId of beforeSnapshot.keys()) {
    const shouldBeRemoved = bubbleIds.includes(bubbleId);

    if (shouldBeRemoved) {
      expect(
        afterSnapshot.has(bubbleId),
        `Expected bubble to be removed, but it is still present`
      ).toBeFalsy();
    } else {
      expect(
        afterSnapshot.has(bubbleId),
        `Expected bubble to be present, but it is removed`
      ).toBeTruthy();
    }
  }
};

// only if the id is definitely there
const getBubbleIdAssuming = async (bubble: Locator) => {
  return bubble.evaluate((node) => {
    // @ts-ignore
    const bubbleMap = window.__autograder_bubbleMap;

    return bubbleMap.get(node) as number;
  });
};

test.beforeEach(async ({ page }) => {
  await page.goto("/part1/index.html");

  await expectBubbleStartState(page);
});

test(
  "Click on a purple bubble, which removes all the purple bubbles",
  {
    annotation: {
      type: "points",
      description: "1",
    },
  },
  async ({ page }) => {
    const beforeSnapshot = await getBubbleSnapshot(page);

    await page.locator(".shape-container .circle.purple").first().click();

    await expectPageHasRemovedBubbleColorsFromSnapshot(page, beforeSnapshot, [
      "purple",
    ]);
  }
);

test(
  "Click on a different purple bubble, which removes all the purple bubbles",
  {
    annotation: {
      type: "points",
      description: "1",
    },
  },
  async ({ page }) => {
    const beforeSnapshot = await getBubbleSnapshot(page);

    await page.locator(".shape-container .circle.purple").nth(3).click();

    await expectPageHasRemovedBubbleColorsFromSnapshot(page, beforeSnapshot, [
      "purple",
    ]);
  }
);

test(
  "Click on a green bubble, which removes all the green and blue bubbles",
  {
    annotation: {
      type: "points",
      description: "0.5",
    },
  },
  async ({ page }) => {
    const beforeSnapshot = await getBubbleSnapshot(page);

    await page.locator(".shape-container .circle.green").first().click();

    await expectPageHasRemovedBubbleColorsFromSnapshot(page, beforeSnapshot, [
      "green",
      "blue",
    ]);
  }
);

test(
  "Click on a different green bubble, which removes all the green and blue bubbles",
  {
    annotation: {
      type: "points",
      description: "0.5",
    },
  },
  async ({ page }) => {
    const beforeSnapshot = await getBubbleSnapshot(page);

    await page.locator(".shape-container .circle.green").nth(3).click();

    await expectPageHasRemovedBubbleColorsFromSnapshot(page, beforeSnapshot, [
      "green",
      "blue",
    ]);
  }
);

test(
  "Click on a blue bubble, which does not remove any bubbles",
  {
    annotation: {
      type: "points",
      description: "0.5",
    },
  },
  async ({ page }) => {
    const beforeSnapshot = await getBubbleSnapshot(page);

    await page.locator(".shape-container .circle.blue").first().click();

    await expectPageHasRemovedBubblesFromSnapshot(page, beforeSnapshot, []);
  }
);

test(
  "Click on an orange, non-bordered bubble, which does not remove any bubbles",
  {
    annotation: {
      type: "points",
      description: "0.5",
    },
  },
  async ({ page }) => {
    const beforeSnapshot = await getBubbleSnapshot(page);

    await page
      .locator(".shape-container .circle.orange:not(.border)")
      .first()
      .click();

    await expectPageHasRemovedBubblesFromSnapshot(page, beforeSnapshot, []);
  }
);

test(
  "Click on an orange, bordered bubble, which removes just that bubble (first)",
  {
    annotation: {
      type: "points",
      description: "0.5",
    },
  },
  async ({ page }) => {
    const beforeSnapshot = await getBubbleSnapshot(page);

    const borderedBubble = page
      .locator(".shape-container .circle.orange.border")
      .first();
    const bubbleId = await getBubbleIdAssuming(borderedBubble);

    await borderedBubble.click();

    await expectPageHasRemovedBubblesFromSnapshot(page, beforeSnapshot, [
      bubbleId,
    ]);
  }
);

test(
  "Click on an orange, bordered bubble, which removes just that bubble (last)",
  {
    annotation: {
      type: "points",
      description: "0.5",
    },
  },
  async ({ page }) => {
    const beforeSnapshot = await getBubbleSnapshot(page);

    const borderedBubble = page
      .locator(".shape-container .circle.orange.border")
      .last();
    const bubbleId = await getBubbleIdAssuming(borderedBubble);
    await borderedBubble.click();

    await expectPageHasRemovedBubblesFromSnapshot(page, beforeSnapshot, [
      bubbleId,
    ]);
  }
);

// probably should have used a classname for this but i already released the starter code :)
test(
  "Hover over the gradient bubble, causing that bubble to be hidden",
  {
    annotation: {
      type: "points",
      description: "1",
    },
  },
  async ({ page }) => {
    const beforeSnapshot = await getBubbleSnapshot(page);

    const gradientCircle = page.locator(".shape-container #gradient-circle");
    const bubbleId = await getBubbleIdAssuming(gradientCircle);

    await gradientCircle.hover({
      noWaitAfter: true,
    });

    // this will fail if the bubble comes back after hovering
    await expectPageHasRemovedBubblesFromSnapshot(page, beforeSnapshot, [
      bubbleId,
    ]);

    // in theory if they make a _new_ bubble i don't think this test setup will
    // fail, but shh that won't happen
  }
);
