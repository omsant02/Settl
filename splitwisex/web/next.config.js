/** @type {import('next').NextConfig} */
const nextConfig = {
  // Set workspace root to silence multiple lockfiles warning
  outputFileTracingRoot: '/Users/apple/Desktop/solidity-basics/splitwisex/web',
  // Add headers to fix CORS issues with wallet extensions
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },

  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        // Fix Synapse SDK WebSocket issues
        bufferutil: false,
        'utf-8-validate': false,
        ws: false,
      };
    }

    // Let Synapse SDK handle its own dependencies on server
    if (isServer) {
      config.externals.push('bufferutil', 'utf-8-validate', 'ws')
    }

    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    // Handle MetaMask SDK React Native dependencies
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };

    return config;
  },
  transpilePackages: ['@wagmi/core', '@wagmi/connectors'],
};

module.exports = nextConfig;