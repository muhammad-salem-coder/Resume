const path = require('path');

module.exports = {
  entry: './src/main.js', // Entry point for your app
  output: {
    filename: 'bundle.js', // Output file after bundling
    path: path.resolve(__dirname, 'dist'), // Output directory
  },
  mode: 'production', // Set to 'production' or 'development'
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader', // Transpile ES6+ to ES5
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'], // Load CSS files
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource', // Handle image files
      },
      {
        test: /\.(glb|gltf)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              outputPath: 'assets/models', // Output path for models
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.js'], // Resolve these file extensions
  },
  devtool: 'source-map', // Generate source maps for easier debugging
  devServer: {
    static: path.join(__dirname, 'dist'),
    compress: true,
    port: 9000,
  },
};
