const path = require('path');
const webpack = require('webpack');

// Shared TS/TSX rule for both configs
const tsRule = {
  test: /\.tsx?$/,
  exclude: /node_modules/,
  use: [
    {
      loader: 'ts-loader',
      options: {
        compilerOptions: {
          module: 'esnext',
          moduleResolution: 'node',
        },
      },
    },
  ],
};

// Extension — runs in Node.js (VSCode host)
const extensionConfig = {
  name: 'extension',
  target: 'node',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]',
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode',
  },
  // `ws` lists bufferutil/utf-8-validate as optional native accelerators;
  // they are absent on this machine and webpack resolution noise otherwise.
  plugins: [
    new webpack.IgnorePlugin({ resourceRegExp: /^(bufferutil|utf-8-validate)$/ }),
  ],
  resolve: {
    extensions: ['.ts', '.js', '.tsx'],
  },
  module: { rules: [tsRule] },
};

// Webview — runs in browser (VSCode webview panel)
const webviewConfig = {
  name: 'webview',
  target: 'web',
  entry: './src/sidebar/webview/main.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'webview.js',
    publicPath: 'auto',
    devtoolModuleFilenameTemplate: '../[resource-path]',
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.js', '.tsx', '.css'],
  },
  module: {
    rules: [
      tsRule,
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
};

module.exports = [extensionConfig, webviewConfig];
