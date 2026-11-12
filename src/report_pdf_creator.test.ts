import assert from "node:assert/strict";
import { buildReportMarkdown } from "./report_pdf_creator.ts";

const markdown = buildReportMarkdown({
  creator: "Algebra Lab",
  period: "2026-W43",
  subscribers: 18,
  deliveredAssets: 7,
  processedPosts: 12
});

assert.match(markdown, /Algebra Lab creator-commerce report/);
assert.match(markdown, /Subscribers updated: 18/);
assert.match(markdown, /Digital assets delivered: 7/);
assert.throws(() => buildReportMarkdown({ creator: "", period: "2026-W43", subscribers: 1, deliveredAssets: 1, processedPosts: 1 }));
console.log("report decision test passed");
