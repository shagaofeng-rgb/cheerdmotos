const nextConfig = {
  async redirects() {
    return [
      {
        source: "/contact",
        destination: "/support",
        permanent: true
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "cheerdmotos.com" }],
        destination: "https://www.cheerdmotos.com/:path*",
        permanent: true
      }
    ];
  }
};

export default nextConfig;
