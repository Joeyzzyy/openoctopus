import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod/v4";
import {
  INTERNAL_ACCESS_COOKIE,
  INTERNAL_ACCESS_COOKIE_VALUE,
} from "@/lib/internal-access";
import { getInternalUserRequests } from "@/lib/internal-admin-server";

const querySchema = z.object({
  userId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
});

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const hasInternalAccess =
    cookieStore.get(INTERNAL_ACCESS_COOKIE)?.value === INTERNAL_ACCESS_COOKIE_VALUE;

  if (!hasInternalAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    userId: url.searchParams.get("userId"),
    page: url.searchParams.get("page") ?? "1",
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const data = await getInternalUserRequests({
      userId: parsed.data.userId,
      page: parsed.data.page,
      pageSize: 10,
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load requests" },
      { status: 500 }
    );
  }
}
