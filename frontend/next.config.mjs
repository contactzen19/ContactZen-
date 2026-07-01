/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/audit/:slug*",
        destination: "/app",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
