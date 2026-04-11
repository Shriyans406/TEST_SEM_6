module.exports = {
  entry: {
    'events.test': "./test/functional/src/events.test.js",
    'snap.test': "./test/functional/src/snap.test.js",
    'cameras.test': "./test/functional/src/cameras.test.js",
    'annotations.test': "./test/functional/src/annotations.test.js",
    'renderingorder.test': "./test/functional/src/renderingorder.test.js",
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        include: /(lib|test|node_modules\/trip.core\/lib|node_modules\/trip.dom\/lib)/,
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
    path: 'test/functional/bundle/',
    filename: "[name].bundle.js"
  },
  devtool: "eval",
  node: {
    net: 'empty',
    dns: 'empty',
    crypto: 'empty',
  }
};
