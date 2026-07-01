/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/audit/:slug*",
        destination: "/sample",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
