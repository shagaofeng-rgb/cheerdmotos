const nextConfig = {
  async redirects() {
    return [
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
