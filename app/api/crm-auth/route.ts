import { NextRequest, NextResponse } from "next/server";

async function authToken(password: string) {
  const bytes = new TextEncoder().encode(`jon-rover-crm:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  const configured = process.env.CRM_PASSWORD;
  if (!configured) return NextResponse.json({ error: "CRM password is not configured." }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const password = String(body?.password || "");
  if (password !== configured) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set("jon_rover_crm_auth", await authToken(configured), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("jon_rover_crm_auth", "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
