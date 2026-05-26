import { redirect } from "next/navigation";

import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { cookies } from "next/headers";

export default async function Home() {
  const store = await cookies();
  const hasSession = Boolean(store.get(AUTH_COOKIE_NAME)?.value);

  redirect(hasSession ? "/dashboard" : "/login");
}
