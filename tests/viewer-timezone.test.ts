import test from "node:test";
import assert from "node:assert/strict";
import { viewerDateHasAvailability } from "../lib/public-slots";
import { DEFAULT_SETTINGS } from "../lib/settings";

test("availability dates shift into the visitor timezone", () => {
  const common = {
    hostTimeZone: "America/New_York",
    settings: DEFAULT_SETTINGS,
    overrides: [],
  };

  assert.equal(
    viewerDateHasAvailability({
      ...common,
      date: "2026-11-09",
      viewerTimeZone: "Pacific/Wallis",
    }),
    false,
    "Monday host hours occur on Tuesday in UTC+12"
  );
  assert.equal(
    viewerDateHasAvailability({
      ...common,
      date: "2026-11-10",
      viewerTimeZone: "Pacific/Wallis",
    }),
    true
  );
  assert.equal(
    viewerDateHasAvailability({
      ...common,
      date: "2026-11-09",
      viewerTimeZone: "America/Los_Angeles",
    }),
    true,
    "Monday host hours remain Monday in Pacific time"
  );
});
