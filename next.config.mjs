const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.shopify.com"
      },
      {
        protocol: "https",
        hostname: "cheerdmoto.com"
      }
    ]
  }
};

export default nextConfig;
