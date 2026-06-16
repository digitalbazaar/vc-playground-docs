// @ts-check
import { defineConfig, createNotesQuery } from "./.app/app-config.js";

export default defineConfig({
  title: "Verifiable Credentials Documentation",
  description:
    "Documentation covering Verifiable Credentials, Verifiable Presentations, "
    + "VC API, and CHAPI, the Credential Handler API.",
  editThisNote: {
    url: "https://github.com/digitalbazaar/vc-playground-docs/edit/{{branch}}/{{file}}",
  },
  staticAssets: {
    paths: { "images/": "images/" },
  },
  ignores: ["README.md"],
  customProperties: {
    properties: [
      {
        name: "author",
        template: "[{{ value.name }}]({{ value.url }})",
      },
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
    links: [
      {
        url: "https://vcplayground.org/",
        label: "VC Playground",
        icon: "play",
      }
    ],
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
});
