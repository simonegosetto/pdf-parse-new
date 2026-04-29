// Standalone shim for use as `pagerenderModule` in worker/process parsers.
// Provides per-page Markdown rendering without document-wide font stats —
// quality is lower than `pdf.markdown(buffer)` (which does a two-pass parse)
// but works in worker_threads / child_process contexts where closures
// cannot be serialized.
//
// Usage:
//   pdf.workers(buffer, {
//     pagerenderModule: require.resolve('pdf-parse-new/lib/markdown-render-page')
//   })

const { markdownRender } = require('./markdown-render.js');

module.exports = markdownRender;
module.exports.render_page = markdownRender;
module.exports.default = markdownRender;
