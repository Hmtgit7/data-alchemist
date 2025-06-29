import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Webpack configuration for Transformers.js
  webpack: (config, { isServer }) => {
    // Ignore node-specific modules when bundling for the browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }

    // Configure for Transformers.js
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      'onnxruntime-node$': false,
    };

    return config;
  },

  // Headers for CORS and model loading
  async headers() {
    return [
      {
        source: '/models/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // External packages configuration  
  serverExternalPackages: ['@xenova/transformers'],

  // Disable static optimization for AI models
  env: {
    CUSTOM_KEY: 'my-value',
  },
};

export default nextConfig;
