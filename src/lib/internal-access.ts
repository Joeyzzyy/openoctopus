import "server-only";

import { createClient } from "@/lib/supabase/server";

export const INTERNAL_ADMIN_PATH = "/ops-hub";
export const INTERNAL_ADMIN_USER_REQUESTS_API_PATH = "/api/ops-hub/user-requests";

const DEFAULT_INTERNAL_ADMIN_EMAILS = ["zhuyuejoey@gmail.com"];

function getAllowedAdminEmails() {
  const configured = process.env.INTERNAL_ADMIN_EMAILS;
  if ((!configured || configured.trim().length === 0) && process.env.NODE_ENV === "production") {
    return new Set<string>();
  }

  const source = configured && configured.trim().length > 0
    ? configured.split(",")
    : DEFAULT_INTERNAL_ADMIN_EMAILS;

  return new Set(
    source
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0)
  );
}

export async function getInternalAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  if (!getAllowedAdminEmails().has(user.email.toLowerCase())) {
    return null;
  }

  return user;
}

export async function assertInternalAdminUser() {
  const user = await getInternalAdminUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
