// @ts-check
const { defineConfig, createNotesQuery } = require("./.app/app-config");

module.exports = defineConfig({
  title: "Verifiable Credentials Documentation",
  description:
    "Documentation covering Verifiable Credentials, Verifiable Presentations, "
    + "VC API, and CHAPI, the Credential Handler API.",
  editThisNote: {
    url: "https://github.com/digitalbazaar/vc-playground-docs/edit/{{branch}}/{{file}}",
  },
  customProperties: {
    properties: [
      {
        path: "props",
        options: {
          date: {
            locale: "en-US",
          },
        },
      },
    ],
  },
  sidebar: {
    sections: [
      {
        label: "Introduction",
        groups: [
          {
            query: createNotesQuery({
              pattern: "^/[^/]+$",
            }),
          },
        ],
      },
      {
        label: "Implementing CHAPI",
        groups: [
          {
            query: createNotesQuery({
              pattern: "^/developers/[^/]+$",
            }),
          },
          {
            label: "Issuers",
            query: createNotesQuery({
              pattern: "^/developers/issuers/",
            }),
          },
          {
            label: "Wallets",
            query: createNotesQuery({
              pattern: "^/developers/wallets/",
              tree: {
                replace: {
                  "^/\\w+/\\w+": "",
                },
              },
            }),
          },
          {
            label: "Verifiers",
            query: createNotesQuery({
              pattern: "^/developers/verifiers/",
            }),
          },
        ],
      },
    ],
  },
  tags: {
    map: {
      "dynamic-content": "dynamic content",
    },
  },
});
