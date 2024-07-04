import { Locator, Page, expect, test } from "@playwright/test";

const ensureOnlyBubbles = async (page: Page) => {
  // avoid a race condition!
  const nonBubblesCount = await page
    .locator(".shape-container > *:not(.circle)")
    .count();
  expect(
    nonBubblesCount,
    `Expected only bubbles to be present in the shape container, but found ${nonBubblesCount} elements`
  ).toBe(0);
};

const getBubbleCount = async (page: Page) => {
  return await page.locator(".shape-container > .circle").count();
};

const ensureBubbleCount = async (
  page: Page,
  {
    atLeast,
    atMost,
  }: {
    atLeast: number;
    atMost: number;
  }
) => {
  const bubbleCount = await getBubbleCount(page);

  expect(
    bubbleCount,
    `Expected between ${atLeast} and ${atMost} bubbles to be present in the shape container, but found ${bubbleCount} bubbles`
  ).toBeGreaterThanOrEqual(atLeast);

  expect(
    bubbleCount,
    `Expected between ${atLeast} and ${atMost} bubbles to be present in the shape container, but found ${bubbleCount} bubbles`
  ).toBeLessThanOrEqual(atMost);

  return bubbleCount;
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

// only if the id is definitely there
const getBubbleIdAssuming = async (page: Page, bubble: ElementHandle) => {
  return page.evaluate((node) => {
    // @ts-ignore
    const bubbleMap = window.__autograder_bubbleMap;

    return bubbleMap.get(node) as number;
  }, bubble);
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

test.beforeEach(async ({ page }) => {
  await page.goto("/part2/index.html");
});

const TIME_PER_BUBBLE = 500;

test(
  "Wait for some bubbles to load",
  {
    annotation: {
      type: "points",
      description: "2",
    },
  },
  async ({ page }) => {
    await ensureOnlyBubbles(page);

    const startCount = await ensureBubbleCount(page, { atLeast: 0, atMost: 5 });

    await new Promise((resolve) => setTimeout(resolve, 5 * TIME_PER_BUBBLE));

    const expectedCount = 5 + startCount;
    const endCount = await ensureBubbleCount(page, {
      atLeast: expectedCount - 1,
      atMost: expectedCount + 1,
    });

    const expectedCount2 = 5 + endCount;

    await new Promise((resolve) => setTimeout(resolve, 5 * TIME_PER_BUBBLE));

    await ensureBubbleCount(page, {
      atLeast: expectedCount2 - 1,
      atMost: expectedCount2 + 1,
    });

    await ensureOnlyBubbles(page);
  }
);

test(
  "Bubbles should have random color",
  {
    annotation: {
      type: "points",
      description: "1",
    },
  },
  async ({ page }) => {
    await ensureOnlyBubbles(page);

    await new Promise((resolve) => setTimeout(resolve, 20 * TIME_PER_BUBBLE));

    const colorClasses = ["red", "orange", "yellow", "green", "blue", "purple"];

    // expect at least 3 distinct colors
    const colors = new Set<string>();

    for (const color of colorClasses) {
      const bubblesCount = await page
        .locator(`.shape-container > .circle.${color}`)
        .count();
      if (bubblesCount > 0) {
        colors.add(color);
      }
    }

    // this should fail 0.0019% of the time, if my math is right
    expect(
      colors.size,
      "Expected at least 3 distinct colors after 20 bubbles spawned"
    ).toBeGreaterThanOrEqual(3);

    await ensureOnlyBubbles(page);
  }
);

test(
  "Stop button should stop the bubbles from spawning",
  {
    annotation: {
      type: "points",
      description: "1.5",
    },
  },
  async ({ page }) => {
    await ensureOnlyBubbles(page);

    await new Promise((resolve) => setTimeout(resolve, 5 * TIME_PER_BUBBLE));

    const startCount = await getBubbleCount(page);

    await page.locator("#stop-button").click();

    await new Promise((resolve) => setTimeout(resolve, 5 * TIME_PER_BUBBLE));

    await ensureBubbleCount(page, {
      atLeast: Math.max(1, startCount - 1),
      atMost: startCount + 1,
    });

    await ensureOnlyBubbles(page);
  }
);

test(
  "Clicking a bubble will cause it to be removed",
  {
    annotation: {
      type: "points",
      description: "1.5",
    },
  },
  // this depends on stopping, because i don't want to deal with new bubbles spawning
  async ({ page }) => {
    await ensureOnlyBubbles(page);

    await new Promise((resolve) => setTimeout(resolve, 7 * TIME_PER_BUBBLE));
    await page.locator("#stop-button").click();

    await new Promise((resolve) => setTimeout(resolve, 100));

    const bubbles = await getBubbleSnapshot(page);

    const bubble1 = (await page.$$(".shape-container > .circle"))[1];
    const bubble1Id = await getBubbleIdAssuming(page, bubble1);

    const bubble2 = (await page.$$(".shape-container > .circle"))[4];
    const bubble2Id = await getBubbleIdAssuming(page, bubble2);

    await bubble1.click();

    await expectPageHasRemovedBubblesFromSnapshot(page, bubbles, [bubble1Id]);

    await bubble2.click();

    await expectPageHasRemovedBubblesFromSnapshot(page, bubbles, [
      bubble1Id,
      bubble2Id,
    ]);

    await ensureOnlyBubbles(page);
  }
);
