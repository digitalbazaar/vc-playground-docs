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
        label: "VC Playground",
        groups: [
          {
            query: createNotesQuery({
              pattern: "^/playground/[^/]+$",
            }),
          },
        ]
      },
      {
        label: "Credential Handler API",
        groups: [
          {
            query: createNotesQuery({
              pattern: "^/chapi/[^/]+$",
            }),
          },
          {
            label: "Issuers",
            query: createNotesQuery({
              pattern: "^/chapi/issuers/",
            }),
          },
          {
            label: "Wallets",
            query: createNotesQuery({
              pattern: "^/chapi/wallets/",
            }),
          },
          {
            label: "Verifiers",
            query: createNotesQuery({
              pattern: "^/chapi/verifiers/",
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
