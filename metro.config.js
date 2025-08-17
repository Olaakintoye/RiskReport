// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const config = getDefaultConfig(__dirname);

// Optimize for development performance
config.maxWorkers = 4; // Limit workers for better performance
config.resetCache = false; // Keep cache for faster builds

// Configure transformer with optimizations
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
};

// Configure resolver with performance optimizations
config.resolver = {
  ...config.resolver,
  sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json', 'cjs', 'mjs'],
  assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg').concat(['ttf', 'otf', 'woff', 'woff2']),
  alias: {
    '@': path.resolve(__dirname, 'client/src'),
    '@shared': path.resolve(__dirname, 'shared'),
    'src': path.resolve(__dirname, 'client/src'),
    '@tanstack/react-query': path.resolve(__dirname, 'node_modules/@tanstack/react-query/build/lib/index.js'),
  },
  blockList: exclusionList([
    /shared\/.*/,
    /server\/.*/,
    /drizzle-orm\/.*/,
    /drizzle-zod\/.*/,
    /pg\/.*/,
    /node_modules\/wouter\/.*/,
    /node_modules\/.*\/node_modules\/.*/, // Exclude nested node_modules
    /\.git\/.*/, // Exclude git files
    /\.vscode\/.*/, // Exclude VS Code files
    /\.idea\/.*/, // Exclude IntelliJ files
  ]),
  resolverMainFields: ['react-native', 'browser', 'main'],
  // Disable package.json exports to fix Node.js module issues
  unstable_enablePackageExports: false,
  // Custom resolve request for handling problematic packages
  resolveRequest: (context, moduleName, platform) => {
    // Special handling for problematic modules
    if (moduleName.startsWith('ws') || 
        moduleName.includes('node_modules/ws') || 
        moduleName === 'axios' ||
        moduleName.includes('@supabase')) {
      return context.resolveRequest(
        { ...context, customResolverOptions: { browser: true } },
        moduleName,
        platform
      );
    }
    
    // Default resolver for other modules
    return context.resolveRequest(context, moduleName, platform);
  }
};

// Optimize watcher for better performance
config.watchFolders = [
  path.resolve(__dirname, 'client/src'),
  path.resolve(__dirname, 'shared'),
];

// Remove any serializer configuration that might be causing issues
if (config.serializer && config.serializer.isThirdPartyModule) {
  delete config.serializer.isThirdPartyModule;
}

// Set project root
config.projectRoot = __dirname;

module.exports = config; 