
module.exports = {
  entry: {
    'databinding.test': "./test/functional/src/databinding.test.js",
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        include: /(lib|test|node_modules\/trip.core\/lib)/,
        loader: 'babel',
        query: {
          presets: [
            require.resolve('babel-preset-es2015'),
          ]
        }
      },
    ],
  },
  output: {
    path: 'test/functional/bundles/',
    filename: "[name].bundle.js"
  },
  devtool: "eval",
  node: {
    net: 'empty',
    dns: 'empty',
    crypto: 'empty',
  }
};
