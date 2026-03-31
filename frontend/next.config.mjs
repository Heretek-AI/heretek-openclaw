/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/heretek-openclaw",
  images: {
    unoptimized: true
  },
  trailingSlash: true
};

export default nextConfig;
