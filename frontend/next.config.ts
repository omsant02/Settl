import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Resolve missing React Native dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "react-native": false,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
      "lokijs": false,
      "utf-8-validate": false,
      "bufferutil": false,
    };

    // Ignore optional dependencies that cause warnings
    config.resolve.alias = {
      ...config.resolve.alias,
      "react-native$": false,
      "react-native/Libraries/Utilities/Platform": false,
    };

    // Exclude problematic modules from bundling
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        "pino-pretty": "pino-pretty",
        "lokijs": "lokijs",
        "utf-8-validate": "utf-8-validate",
        "bufferutil": "bufferutil",
      });
    }

    // Optimize bundle splitting
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          wallet: {
            test: /[\\/]node_modules[\\/](@rainbow-me|@wagmi|viem|@walletconnect)[\\/]/,
            name: "wallet",
            chunks: "all",
            priority: 10,
          },
        },
      },
    };

    return config;
  },
  // Ignore build warnings for optional dependencies
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
