import type { NextConfig } from "next";

// The product media is served by the backend (PUBLIC_URL/media). Allow that
// origin for next/image; derive it from the public API URL so dev + prod match.
const mediaOrigin = process.env.NEXT_PUBLIC_MEDIA_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const media = new URL(mediaOrigin);

const nextConfig: NextConfig = {
  images: {
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
