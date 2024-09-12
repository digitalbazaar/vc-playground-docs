const {
  EleventyHtmlBasePlugin,
  EleventyRenderPlugin
} = require("@11ty/eleventy");
const syntaxHighlightPlugin = require("@11ty/eleventy-plugin-syntaxhighlight");

const pathPrefix = process.env.ELEVENTY_NOTES_PATH_PREFIX || undefined;
module.exports = {
  mdLibrary: require("./md.library"),

  configObj: {
    pathPrefix,
    dir: {
      input: "./../",
      output: `dist/${pathPrefix ? pathPrefix : ''}`,
      data: ".app/_data",
      includes: ".app/lib",
    },
    markdownTemplateEngine: "njk",
  },

  setup(config) {
    config.setLibrary("md", this.mdLibrary(config));

    config.addPlugin(EleventyRenderPlugin);
    config.addPlugin(EleventyHtmlBasePlugin);
    config.addPlugin(syntaxHighlightPlugin);

    config.setServerOptions({
      watch: [
        `dist/${pathPrefix ? pathPrefix + '/' : ''}app.js`,
        `dist/${pathPrefix ? pathPrefix + '/' : ''}app.*.css`],
    });

    config.addWatchTarget("./../app.js");
  },
};
