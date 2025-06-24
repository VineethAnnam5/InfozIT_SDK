const copy = require('rollup-plugin-copy');

module.exports = {
  input: 'src/index.js',
  output: {
    file: 'dist/push-sdk.min.js', // Rename output for clarity
    format: 'iife',
    name: 'pushSDK',
  },
  plugins: [
    copy({
      targets: [
        { src: 'src/sw/service-worker.js', dest: 'dist' }
      ]
    })
  ]
};
