const eleventyMermaidPlugin = require('@kevingimbel/eleventy-plugin-mermaid');
const mermaidShortcode = require('./mermaid');
const mermaidFullscreenJsShortcode = require(
  './mermaid_fullscreen_js');

module.exports = {

  /**
   * Sets up the module
   * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
   */
  setup(eleventyConfig) {
    eleventyConfig.addPlugin(eleventyMermaidPlugin,
      { extra_classes: 'attached' });
    // add custom JS for loading SVG pan/zoom features
    eleventyConfig.addShortcode('mermaid_with_callback_js',
      mermaidFullscreenJsShortcode);
    // add fullscreen-able mermaid display
    eleventyConfig.addPairedShortcode('mermaid', mermaidShortcode);
  },
};
