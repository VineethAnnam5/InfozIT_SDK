// push-notification-sdk/rollup.config.cjs

const copy = require('rollup-plugin-copy');
// You might need to install @rollup/plugin-node-resolve and @rollup/plugin-commonjs
// if your SDK uses any Node.js specific modules or commonjs imports from node_modules.
// npm install --save-dev @rollup/plugin-node-resolve @rollup/plugin-commonjs

// If your SDK is written in TypeScript, you'll also need @rollup/plugin-typescript
// npm install --save-dev @rollup/plugin-typescript typescript
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
// const typescript = require('@rollup/plugin-typescript'); // Uncomment if using TypeScript

// Get package.json to define output filenames based on convention
const pkg = require('./package.json');

// Define a global name for your SDK when used in a <script> tag
// This will be accessible as `window.InfozitPushSDK` in the browser
const GLOBAL_SDK_NAME = 'InfozitPushSDK'; // Choose a unique name for your SDK

module.exports = {
  input: 'src/index.js', // Main entry point for your SDK
  output: [
    // 1. ESM build for NPM (your current setup)
    {
      file: pkg.module || 'dist/infozit-push-sdk.esm.js', // Use pkg.module if defined, fallback otherwise
      format: 'es', // Format as ES Module
      sourcemap: true, // Generate sourcemap for easier debugging
      exports: 'named', // Ensure named exports are correctly handled
    },
    // 2. NEW: UMD build for <script> tag (plain HTML and Node.js compatibility)
    {
      file: pkg.main || 'dist/infozit-push-notification-sdk.umd.js', // Use pkg.main if defined, fallback otherwise
      format: 'umd', // Universal Module Definition
      name: GLOBAL_SDK_NAME, // The name of the global variable on `window`
      sourcemap: true, // Generate sourcemap
      exports: 'named', // Ensure named exports work when accessed via the global object
      // If your SDK has external dependencies (like 'lodash' or 'axios')
      // that you expect to be available as globals when used in a <script> tag,
      // you would list them here. For a pure JS SDK, you might not need this.
      // globals: {
      //   'lodash': '_'
      // }
    }
  ],
  plugins: [
    resolve(), // Helps Rollup find modules in node_modules
    commonjs(), // Converts CommonJS modules to ES Modules for Rollup
    // typescript(), // Uncomment and configure if you are using TypeScript
    copy({
      targets: [
        { src: 'src/sw/service-worker.js', dest: 'dist' } // Copies the service worker
      ]
    })
  ]
  // If you have peer dependencies that should not be bundled but assumed to be available
  // on the client's side (e.g., React if your SDK was a React component library),
  // you would list them here:
  // external: ['react', 'react-dom']
};