import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ROLES = ["admin", "employee", "client"];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const role = searchParams.get("role");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Dev convenience: /login?role=x carries through to here (see README).
      if (role && ROLES.includes(role)) {
        await supabase.rpc("set_login_role", { requested: role });
      }
      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
