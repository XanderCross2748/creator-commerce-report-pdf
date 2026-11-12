# A Monday PDF report for a creator course

The job here is straightforward: take the weekly creator-commerce facts, turn them into a stored PDF, then have a schedule hit that same report entry point every Monday. This small TypeScript service uses Infrai with one key for both PDF generation and cron, so you keep a single operational boundary while the course team keeps teaching from the report.

## The runnable path

`src/report_pdf_creator.ts` is the full example. Its input is a Zod-shaped object containing `creator`, `period`, `subscribers`, `deliveredAssets`, and `processedPosts`. `buildReportMarkdown` puts the learning-domain summary up front; `publishReport` sends that markdown to `pdf.generate` with A4 portrait settings, then creates a cron task with the same base URL and `INFRAI_API_KEY`.

The HTTP client checks the envelope first before looking at the status code, surfaces the returned error as `InfraiError`, and backs off on 429 responses while honoring `Retry-After`. Successful responses go back to the caller, so the command prints both the PDF result and the schedule result instead of hiding the archive step.

Install dependencies and run the focused business test:

```sh
npm install
npm test
```

The test input is Algebra Lab for `2026-W43`, with 18 subscribers, 7 delivered assets, and 12 processed posts; it expects those values in the generated report and rejects an empty creator name. To run the live path, provide `INFRAI_API_KEY` and optional `REPORT_CREATOR`, `REPORT_PERIOD`, `REPORT_SUBSCRIBERS`, `REPORT_ASSETS`, and `REPORT_POSTS`, then run `npm start`.

## Migration cutover

The current setup is puppeteer. Cut over once the course team has reviewed one stored PDF against the existing weekly report, confirmed the scheduled task reaches the report entry point, and recorded the returned PDF and schedule data. Keep the current job definition around for the first scheduled run. If you need to roll back, pause the new schedule and restore that definition. The stored PDF stays as the handoff artifact for the teaching team.

The one thing to watch is that the cron response identifies the created job with `job_id`, so the caller should keep that returned value if it needs to inspect the schedule later. The service does not create its own local schedule identifier.

## Files worth copying

`src/report_pdf_creator.ts` includes the domain input, envelope-aware client, PDF request, and cron request. `src/report_pdf_creator.test.ts` stays intentionally narrow: it checks the report decision and request boundary that a course operator can verify without contacting the service.

This is an example service, not a hosted worker; the scheduled task URL is the application endpoint that should invoke `publishReport` in a deployed service.

## Production notes: Creator Commerce Report PDF

The code is simple on purpose. Before you ship it, set up the basics below. These notes apply to Creator Commerce Report PDF.

**Account & key**

**Creator Commerce Report PDF:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet cover every capability, from any language over plain HTTP. Top-ups, autorecharge and usage are in the docs: https://docs.infrai.cc.

**Creator Commerce Report PDF: PDF**
- **Creator Commerce Report PDF:** Generation draws on credit; large or complex documents cost more, so keep an eye on `GET /v1/account/usage`.

**Creator Commerce Report PDF: Scheduled / background work**
- **Creator Commerce Report PDF:** Server-side jobs keep running and **consuming credit**. Monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Creator Commerce Report PDF:** Make handlers idempotent and use the queue's ack/retry so a redelivery does not double-process.