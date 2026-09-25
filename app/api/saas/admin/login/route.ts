import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const adminSecret = process.env.ADMIN_SECRET_KEY || "admin888";

    if (password === adminSecret) {
      const res = NextResponse.json({ success: true, token: adminSecret });
      // 寫入 HttpOnly Session Cookie
      res.cookies.set("admin_session", adminSecret, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 86400 * 7 // 7 天
      });
      return res;
    }

    return NextResponse.json({ error: "密碼不正確，請確認" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "登入失敗" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("admin_session");
  return res;
}
