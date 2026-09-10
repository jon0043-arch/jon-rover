import { NextRequest, NextResponse } from "next/server";

async function authToken(password: string) {
  const bytes = new TextEncoder().encode(`jon-rover-crm:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const configured = process.env.CRM_PASSWORD;

  if (!configured) {
    if (path.startsWith("/api/crm")) return NextResponse.json({ error: "CRM password is not configured." }, { status: 503 });
    return NextResponse.next();
  }

  const expected = await authToken(configured);
  const actual = req.cookies.get("jon_rover_crm_auth")?.value || "";
  const authed = actual === expected;

  if (path === "/crm/login") {
    if (authed) return NextResponse.redirect(new URL("/crm", req.url));
    return NextResponse.next();
  }

  if (path.startsWith("/api/crm-auth")) return NextResponse.next();

  if (!authed) {
    if (path.startsWith("/api/crm")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/crm/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/crm/:path*", "/api/crm/:path*", "/api/crm-auth/:path*"],
};
