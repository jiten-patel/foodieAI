import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Only /admin/* is gated — chat is intentionally open to everyone (guests
// get /api/recommend, logged-in users get /api/chat; see useChat.js).
export default async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== "admin") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
