const webpack = require('webpack')
const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')

module.exports = {
  context: __dirname,
  devtool: 'eval-source-map',
  entry: {

    /* 'Autodesk.ADN.Viewing.Extension.BasicES2015':
      './src/Autodesk.ADN.Viewing.Extension.BasicES2015/Autodesk.ADN.Viewing.Extension.BasicES2015.js', */

    /* 'Viewing.Extension.StateManager':
      './src/Viewing.Extension.StateManager/Viewing.Extension.StateManager.js', */

    /* 'Viewing.Extension.Markup2D':
      './src/Viewing.Extension.Markup2D/Viewing.Extension.Markup2D.js', */

    /* 'Autodesk.ADN.Viewing.Extension.ModelLoader':
      './src/Autodesk.ADN.Viewing.Extension.ModelLoader/Autodesk.ADN.Viewing.Extension.ModelLoader.js', */

    /* 'Viewing.Extension.ModelTransformer':
      './src/Viewing.Extension.ModelTransformer/Viewing.Extension.ModelTransformer.js', */

    /* 'Autodesk.ADN.Viewing.Extension.PropertyPanel':
      './src/Autodesk.ADN.Viewing.Extension.PropertyPanel/Autodesk.ADN.Viewing.Extension.PropertyPanel.js', */

    /* 'Viewing.Extension.CustomTree':
      './src/Viewing.Extension.CustomTree/Viewing.Extension.CustomTree.js', */

    /* '_Viewing.Extension.CSSTV':
      './src/Viewing.Extension.CSSTV/Viewing.Extension.CSSTV.js', */

    /* '_Viewing.Extension.ControlSelector':
      './src/Viewing.Extension.ControlSelector/Viewing.Extension.ControlSelector.js', */

    /* '_Viewing.Extension.ExtensionManager':
      './src/Viewing.Extension.ExtensionManager/Viewing.Extension.ExtensionManager.js', */

    /* 'Viewing.Extension.Particle':
      './src/Viewing.Extension.Particle/Viewing.Extension.Particle.js', */

    /* '_Viewing.Extension.Particle.LHC':
      './src/Viewing.Extension.Particle/Viewing.Extension.Particle.LHC.js', */

    /* 'Viewing.Extension.PointCloud':
      './src/Viewing.Extension.PointCloud/Viewing.Extension.PointCloud.js', */

    /* 'Autodesk.ADN.Viewing.Extension.React':
      './src/Autodesk.ADN.Viewing.Extension.React/Autodesk.ADN.Viewing.Extension.React.js', */

    /* 'Viewing.Extension.CustomModelStructure':
      './src/Viewing.Extension.CustomModelStructure/Viewing.Extension.CustomModelStructure.js', */

    'Viewing.Extension.Transform':
      './src/Viewing.Extension.Transform/Viewing.Extension.Transform.js',

    /* 'Viewing.Extension.InViewerSearchWrapper':
      './src/Viewing.Extension.InViewerSearch/Viewing.Extension.InViewerSearch.js', */

    /* 'Viewing.Extension.Markup3D':
      './src/Viewing.Extension.Markup3D/Viewing.Extension.Markup3D.js', */

    /* 'Viewing.Extension.VisualReport':
      './src/Viewing.Extension.VisualReport/Viewing.Extension.VisualReport.js' */
  },
  output: {
    path: path.resolve(__dirname, './public/js'),
    filename: "[name].js"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader', // 使用 Babel 來轉換 JavaScript
          options: {
            presets: ['@babel/preset-env'], // 使用特定的 Babel 預設設置
          },
        },
      },
    ]
  },
  plugins: [],
  optimization: {
    minimize: false, // 或者 false，根據您的需求
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: false, // 和之前的compress: false相同
            // 其他壓縮選項...
          },
          mangle: false, // 和之前的mangle: false相同
          // 其他Terser選項...
        },
      }),
    ],
  },
}