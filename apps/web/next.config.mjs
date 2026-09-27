/** @type {import('next').NextConfig} */
const nextConfig = {
  // Local API access uses app/backend/[...path]/route.ts so browser Origin
  // is not forwarded to the production Cloud Run API (CORS allowlist).
};

export default nextConfig;
