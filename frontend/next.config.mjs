/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  output: "standalone",

  async rewrites() {
    return [
      {
        // Every browser call to the FastAPI backend goes through this
        // distinct prefix — same-origin from the browser's point of view, so
        // the backend's httpOnly auth cookies actually land (a cookie set on
        // Render's domain is never sent back to Vercel's). Kept fully
        // separate from bare /api/auth/* and /api/*, which are real Next.js
        // routes (NextAuth's handler) — a broader /api/:path* rule was found
        // to intercept those before Next.js's own routing got to them.
        source: "/api/backend/:path*",
        destination: `${process.env.BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
