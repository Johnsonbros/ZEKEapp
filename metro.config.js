const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  minifierConfig: {
    compress: {
      drop_console: process.env.NODE_ENV === 'production',
      drop_debugger: true,
    },
    mangle: true,
    output: {
      comments: false,
    },
  },
};

config.maxWorkers = 2;

config.resolver = {
  ...config.resolver,
};

module.exports = config;
