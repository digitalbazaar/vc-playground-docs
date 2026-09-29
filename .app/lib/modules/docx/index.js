const fs = require("fs/promises");
const path = require("path");

const MARKER = "data-docx-download";
const SITE_URL = (process.env.DOCS_SITE_URL || "https://vcplayground.org/docs")
  .replace(/\/$/, "");
const REFERENCE_DOCX = path.join(__dirname, "reference.docx");
const TABLE_WIDTHS = path.join(__dirname, "table-widths.lua");

module.exports = {
  /**
   * Sets up the module: a `docxDownload` shortcode that renders a download
   * link, and a post-build step that converts the Markdown source of every
   * page that uses it into a Word file next to the page.
   * @param {import("@11ty/eleventy").UserConfig} config
   */
  setup(config) {
    config.addShortcode("docxDownload", function () {
      const file = docxFileName(this.page.url);
      return `<p class="button-row"><a class="btn2" href="${file}" download ${MARKER}>Download as .docx</a></p>`;
    });

    config.on("eleventy.after", async ({ results }) => {
      const pages = results.filter(
        (result) => result.outputPath && result.content.includes(MARKER)
      );
      if (pages.length === 0) return;
      const { convert } = await import("pandoc-wasm");
      const reference = new Blob([await fs.readFile(REFERENCE_DOCX)]);
      const tableWidths = await fs.readFile(TABLE_WIDTHS, "utf8");
      for (const page of pages) {
        const source = await fs.readFile(page.inputPath, "utf8");
        const { title, markdown } = toPandocMarkdown(source, page);
        const images = await readImages(markdown, path.dirname(page.inputPath));
        const result = await convert(
          {
            from: "gfm",
            to: "docx",
            "output-file": "out.docx",
            "reference-doc": "reference.docx",
            filters: ["table-widths.lua"],
            metadata: { title },
          },
          markdown,
          { "reference.docx": reference, "table-widths.lua": tableWidths, ...images }
        );
        const docx = result.files["out.docx"];
        if (!docx) {
          throw new Error(`docx: pandoc produced no file for ${page.inputPath}: ${result.stderr}`);
        }
        const target = path.join(path.dirname(page.outputPath), docxFileName(page.url));
        await fs.writeFile(target, Buffer.from(await docx.arrayBuffer()));
      }
    });
  },
};

function docxFileName(url) {
  const slug = url.replace(/^\/|\/$/g, "").replace(/\//g, "-") || "index";
  return `${slug}.docx`;
}

// Turns a page's Eleventy Markdown into plain GFM that pandoc can read: no
// front matter, no template tags, callouts as bold-titled quotes, and links
// that work outside the site.
function toPandocMarkdown(source, page) {
  const frontMatter = source.match(/^---\n([\s\S]*?)\n---\n/);
  const title = frontMatter?.[1].match(/^title:\s*"?(.*?)"?\s*$/m)?.[1] || page.url;
  const webUrl = `${SITE_URL}${page.url}`;

  let markdown = source
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/^\{%\s*docxDownload\s*%\}\s*$/gm, "")
    .replace(
      /\{%\s*mermaid\s*%\}[\s\S]*?\{%\s*endmermaid\s*%\}/g,
      `*This diagram is on the web version of this page: <${webUrl}>*`
    )
    .replace(/^(>\s*)\[!(\w+)\][+-]?(?: +(.+))?$/gm, (_, quote, type, heading) =>
      `${quote}**${heading || type[0].toUpperCase() + type.slice(1)}**\n${quote}`
    )
    .replace(/(\]\()([^)\s]+)/g, (_, open, href) => open + absoluteUrl(href, page.url))
    .replace(/(href=")([^"]+)/g, (_, open, href) => open + absoluteUrl(href, page.url));

  const leftover = markdown.match(/\{%.*?%\}/);
  if (leftover) {
    throw new Error(`docx: ${page.inputPath} uses ${leftover[0]}, which the Word export does not handle`);
  }

  markdown = `Web version: <${webUrl}>\n\n${markdown}`;
  return { title, markdown };
}

function absoluteUrl(href, pageUrl) {
  if (/^([a-z]+:|#)/i.test(href) || /\.(png|jpe?g|gif|svg|webp)$/i.test(href)) {
    return href;
  }
  const resolved = new URL(href, `http://site${pageUrl}`);
  return `${SITE_URL}${resolved.pathname}${resolved.hash}`;
}

// pandoc can only embed images that it is given as files
async function readImages(markdown, pageDir) {
  const images = {};
  for (const [, src] of markdown.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) {
    if (/^[a-z]+:/i.test(src)) continue;
    images[src] = new Blob([await fs.readFile(path.resolve(pageDir, src))]);
  }
  return images;
}
