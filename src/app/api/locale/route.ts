import { NextResponse } from "next/server";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const locale = normalizeLocale((body as { locale?: unknown }).locale);
  const response = NextResponse.json({ locale });

  response.cookies.set(LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
