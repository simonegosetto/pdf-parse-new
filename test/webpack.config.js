const path = require("path");
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
	mode: 'production',
	target: 'node',
	node: {
		__dirname: false,
		__filename: false,
	},
	module: {
		rules: [
			{
				test: /\.node$/,
				loader: "node-loader",
			},
		],
	},
	entry: './QUICKSTART.js',
	output: {
		path: path.resolve(process.cwd(), `test`),
		filename: 'build.js',
		// clean: true,
	},
	resolve: {
		alias: {
			'pdf.worker.js': path.resolve(process.cwd(), `lib\\pdf.js\\v4.5.136\\build\\pdf.worker.js`)
		}
	},
	/*plugins: [
		new CopyWebpackPlugin({
			patterns: [
				{
					from: path.resolve(process.cwd(), `lib\\pdf.js\\v4.5.136\\build\\pdf.worker.js`),
					to: path.resolve(process.cwd(), `test`),
				},
			],
		}),
	],*/
}
