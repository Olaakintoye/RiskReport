module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './client/src',
            '@shared': './shared',
            'src': './client/src',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
}; 