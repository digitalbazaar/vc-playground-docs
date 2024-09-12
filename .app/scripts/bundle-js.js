const { Parcel } = require("@parcel/core");

const args = process.argv.slice(2);
const isWatchMode = args.includes("--watch");

const distDir = process.env.ELEVENTY_NOTES_PATH_PREFIX
  ? `./dist/${process.env.ELEVENTY_NOTES_PATH_PREFIX}`
  : './dist/';

let bundler = new Parcel({
  entries: "js/app.js",
  mode: isWatchMode ? "development" : "production",
  defaultConfig: "@parcel/config-default",
  targets: {
    default: {
      distDir,
      outputFormat: 'esmodule'
    }
  }
});

if (isWatchMode) {
  bundler.watch();
} else {
  bundler.run();
}
