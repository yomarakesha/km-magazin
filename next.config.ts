import type { NextConfig } from "next";

// The product media is served by the backend (PUBLIC_URL/media). Allow that
// origin for next/image; derive it from the public API URL so dev + prod match.
const mediaOrigin = process.env.NEXT_PUBLIC_MEDIA_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const media = new URL(mediaOrigin);

// Next 16 blocks optimizer fetches that resolve to private IPs (SSRF guard).
// The backend serves media from the same box, so allow it only when the media
// origin is a local/private host (dev and single-server deploys).
const localMedia = ["localhost", "127.0.0.1", "::1"].includes(media.hostname);

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowLocalIP: localMedia,
    remotePatterns: [
      {
        protocol: media.protocol.replace(":", "") as "http" | "https",
        hostname: media.hostname,
        port: media.port || undefined,
        pathname: "/media/**",
      },
    ],
  },
};

export default nextConfig;
