const nextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/en",
        destination: "/",
        permanent: true
      },
      {
        source: "/en/:path*",
        destination: "/:path*",
        permanent: true
      },
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
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {key: "X-Content-Type-Options", value: "nosniff"},
          {key: "X-Frame-Options", value: "SAMEORIGIN"},
          {key: "Referrer-Policy", value: "strict-origin-when-cross-origin"},
          {key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()"}
        ]
      }
    ];
  }
};

export default nextConfig;
