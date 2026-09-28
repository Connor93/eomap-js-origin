const { merge } = require("webpack-merge");
const path = require("node:path");
const base = require("../base");
const TerserPlugin = require("terser-webpack-plugin");

const babelOptions = {
  assumptions: {
    setPublicClassFields: true,
  },
  plugins: [
    ["@babel/plugin-proposal-decorators", { decoratorsBeforeExport: true }],
    ["@babel/plugin-proposal-class-properties"],
  ],
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          browsers: [
            "last 2 Chrome versions",
            "Firefox >= 63",
            "Safari >= 12.1",
          ],
        },
      },
    ],
  ],
};

module.exports = (env) =>
  merge(base(env), {
    entry: "./src/web/index.js",
    output: {
      // Content-hashed: the editor is embedded in an iframe the host app mounts
      // after load, which never receives a reload's cache bypass. With a stable
      // filename a browser that cached the bundle before it had a Cache-Control
      // header keeps serving it -- so a deploy is invisible until the heuristic
      // freshness window lapses. A hash in the name changes the URL instead,
      // which no cache entry can match.
      filename: "bundle.[contenthash].min.js",
      path: path.resolve(__dirname, "../../dist/web"),
      publicPath: "auto",
      // Hashed names accumulate otherwise -- every past build would ship in the
      // image alongside the current one.
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: babelOptions,
          },
        },
        {
          test: /\.worker\.js$/i,
          exclude: /node_modules/,
          use: [
            {
              loader: "worker-loader",
            },
            {
              loader: "babel-loader",
              options: babelOptions,
            },
          ],
        },
      ],
    },
    optimization: {
      minimize: process.env.NODE_ENV === "production",
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            output: {
              comments: false,
            },
          },
        }),
      ],
    },
  });
