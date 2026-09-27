import { type NextRequest, NextResponse } from "next/server";

const API_ORIGIN =
  process.env.BDAG_API_PROXY_ORIGIN ||
  "https://bdag-multisig-api-754643864450.europe-west4.run.app";

async function proxy(request: NextRequest, path: string[]) {
  const target = new URL(path.join("/"), `${API_ORIGIN}/`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  // Do not forward browser Origin — production API CORS rejects localhost.

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  const upstream = await fetch(target, init);
  const body = await upstream.text();

  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") || "application/json",
    },
  });
}

type RouteContext = {
  params: { path?: string[] };
};

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, context.params.path ?? []);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, context.params.path ?? []);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
