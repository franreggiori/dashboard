import { NextResponse } from "next/server";
import { CORRECT_PASSWORD, setSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = await req.json();
  if (password !== CORRECT_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  setSession();
  return NextResponse.json({ ok: true });
}
