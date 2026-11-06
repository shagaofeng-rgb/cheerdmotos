const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "laikegeo.oss-cn-shanghai.aliyuncs.com",
        port: "",
        pathname: "/uploads/**",
        search: ""
      }
    ]
  },
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
        source: "/news/smart-mobility-support-planning-20260708-3",
        has: [{type: "host", value: "cheerdmotos.com"}],
        destination: "https://www.cheerdmotos.com/news/smart-mobility-support-planning",
        permanent: true
      },
      {
        source: "/news/fat-tire-ebike-city-trail-selection",
        has: [{type: "host", value: "cheerdmotos.com"}],
        destination: "https://www.cheerdmotos.com/blog/fat-tire-ebike-city-trail-selection",
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
      },
      {
        source: "/checkout/:path*",
        headers: [
          {key: "Cache-Control", value: "private, no-store"},
          {key: "Referrer-Policy", value: "no-referrer"},
          {key: "X-Robots-Tag", value: "noindex, nofollow"}
        ]
      }
    ];
  }
};

export default nextConfig;
