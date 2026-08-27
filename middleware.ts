export { default } from "next-auth/middleware/";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/documents/:path*",
    "/api/generate/:path*",
    "/api/documents/:path*",
    "/api/templates/:path*",
  ],
};
