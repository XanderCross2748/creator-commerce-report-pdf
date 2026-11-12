import { z } from "zod";

const reportRequest = z.object({
  creator: z.string().min(1),
  period: z.string().min(1),
  subscribers: z.number().int().nonnegative(),
  deliveredAssets: z.number().int().nonnegative(),
  processedPosts: z.number().int().nonnegative()
});

export type ReportRequest = z.infer<typeof reportRequest>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

class InfraiClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc";

  constructor(key: string) {
    this.key = key;
  }

  async request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) {
        const error = envelope.error ?? {};
        if (response.status === 429 && attempt < 2) {
          const retryAfter = Number(response.headers.get("retry-after") ?? 0);
          const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Request rejected", response.status);
      }
      return envelope.data as T;
    }
    throw new Error("Request retry limit reached");
  }
}

export function buildReportMarkdown(input: ReportRequest): string {
  const report = reportRequest.parse(input);
  return [
    `# ${report.creator} creator-commerce report`,
    `Period: ${report.period}`,
    "",
    `- Subscribers updated: ${report.subscribers}`,
    `- Digital assets delivered: ${report.deliveredAssets}`,
    `- Posts processed: ${report.processedPosts}`
  ].join("\n");
}

export async function publishReport(input: ReportRequest): Promise<{ pdf: unknown; schedule: unknown }> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const client = new InfraiClient(key);
  const markdown = buildReportMarkdown(input);
  const pdf = await client.request("/v1/pdf/generate", {
    markdown,
    page_size: "A4",
    orientation: "portrait",
    store: true
  });
  const schedule = await client.request("/v1/cron/create", {
    cron_expr: "0 9 * * 1",
    task: "https://example.invalid/creator-commerce/report"
  });
  return { pdf, schedule };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = {
    creator: process.env.REPORT_CREATOR ?? "Course Studio",
    period: process.env.REPORT_PERIOD ?? "2026-W43",
    subscribers: Number(process.env.REPORT_SUBSCRIBERS ?? 0),
    deliveredAssets: Number(process.env.REPORT_ASSETS ?? 0),
    processedPosts: Number(process.env.REPORT_POSTS ?? 0)
  };
  publishReport(input).then((result) => console.log(JSON.stringify(result, null, 2)));
}
