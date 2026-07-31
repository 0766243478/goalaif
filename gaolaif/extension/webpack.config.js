const path = require('path');

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
  resolve: {
    extensions: ['.ts', '.js', '.tsx'],
  },
  module: { rules: [tsRule] },
};

// Webview — runs in browser (VSCode webview panel)
const webviewConfig = {
  name: 'webview',
  target: 'web',
  entry: './src/sidebar/webview/App.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'webview.js',
    publicPath: './',
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
