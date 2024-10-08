---
title: OID4* Integration
---

> [!warning]
> These details are subject to change as we iron out this integration approach.

The OID4VCI and OID4VP protocols require a high level or coordination between
relying parties, authentication servers, and credential issuing/verifying
services. To avoid on going overhead for joining the VC Playground, the
following minimal code can be hosted to provide a VC API Exchange to wrap the
OID4* protocols to more easily connect the VC Playground to your services.

## Minimal Server Setup

We've extracted the minimal bit for
[creating an exchange from VC API Exchanges](https://w3c-ccg.github.io/vc-api/#create-exchange)
to provide this capability.

First, setup an HTTP endpoint to accept a POST request. That endpoint will
currently receive a payload similar to the following when an issue request is
made:

```js
{
  // 15 minute expiry in seconds
  ttl: 60 * 15,
  // template variables
  variables: {
    credentialId: `urn:uuid:${uuid()}`,
    vc: template // a copy of the selected credential + template "holes"
  },
  // OID4VCI
  openId: {
    expectedCredentialRequests: [
      {
        format: 'ldp_vc',
        credential_definition: {
          // the `@context` value of the selected credential
          '@context': credential['@context'],
          // the top-level `type` value of the selected credential
          type: credential.type
        }
      }
    ],
    oauth2: {generateKeyPair: {algorithm: 'ES256'}},
    preAuthorizedCode // a UUID
  }
}
```

NOTE: the `credential_definition` list can be populated from the
[vc-examples repo](https://github.com/credential-handler/vc-examples/).

Once the POST request is received, the response should have an empty body, but
provide a `Location` header containing the "exchange ID"--the URL of the
exchange (in VC API terminology).

The VC Playground will use the value of the `Location` header, append
`/protocols` to that URL, and send a GET request to that full URL.

The response from your system would be a simple JSON object stating support for
OID4VCI (or OID4VP) plus the value needed to continue the OID4* flow. The
response should look structurally like the following:

```jsonc
{
  "protocols": {
    // or OID4VP if doing verification
    "OID4VCI": "openid-credential-offer://..."
  }
}
```

Once that OID4* URL is provide to the Playground, the communication will
continue over either OID4VCI (for issuing) or OID4VP (for verifying).
