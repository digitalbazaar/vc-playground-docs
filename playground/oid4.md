---
title: OID4* Integration
permalink: /playground/oid4/
---

> [!warning]
> These details are subject to change as we iron out this integration approach.

The OID4VCI and OID4VP protocols require a high level or coordination between
relying parties, authentication servers, and credential issuing/verifying
services. To avoid on going overhead for joining the VC Playground, the
following minimal code can be hosted to provide a
[VC API Exchange](https://w3c-ccg.github.io/vc-api/#workflows-and-exchanges:~:text=An%20issuer%2C%20verifier%2C%20or%20holder%20coordinator%20is%20responsible%20for%20creating%20exchanges.)
to wrap the OID4* protocols to more easily connect the VC Playground to your
services.

## Minimal Server Setup

We've extracted the minimal bit for
[creating an exchange from VC API Exchanges](https://w3c-ccg.github.io/vc-api/#create-exchange)
to provide this capability.

First, setup an HTTP endpoint to accept a POST request. This endpoint can
be [ZCAP](https://w3c-ccg.github.io/zcap-spec/) or OAuth-protected if desired;
the appropriate authorization tokens or credentials must be provided to the
playground for integration.

The URL should look something like the following:

```
https://my-oid4-service.example/workflows/<uuid1>/exchanges
```

NOTE: if your system does not offer a full VC API Workflow setup, then replace
the `<uuid1>` value in the above URL with a static UUID.

This exchanges endpoint will receive a payload similar to the following when an
issue request is made:

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

Once the POST request is received, the response can have an empty body, but it
must provide a `Location` header containing the "exchange ID"--the URL of the
exchange (in VC API terminology). This endpoint MUST NOT be
authorization-protected and MUST be a capability URL, i.e., it must include
sufficient pseudo-randomness (e.g., a UUID) for the particular exchange, for example,
replace `<uuid2>` with a UUID in the example below:

```
https://my-oid4-service.example/workflows/<uuid1>/exchanges/<uuid2>
```

The VC Playground will use the value of the `Location` header, append
`/protocols` to that URL, and send a GET request to that full URL.

The response from your system would be a simple JSON object stating support for
OID4VCI (or OID4VP) plus the value needed to continue the OID4* flow. The
response should look structurally like the following:

```js
{
  "protocols": {
    // or OID4VP if doing verification
    "OID4VCI": "openid-credential-offer://..."
  }
}
```

The playground will use the above object to allow compatible digital wallets to
interact with your service in a variety of ways: CHAPI, multiprotocol URL / QR
code, and OID4* URL / QR code. Once delivered using one of these mechanisms, the
communication will continue over either OID4VCI (for issuing) or OID4VP (for
verifying).

## User Journey and HTTP Flow

The VC Playground provides two options for selecting an OID4-based flow:
- CHAPI-based via the "cog" menu
- QR code-based via the "Generate a QR Code" link

In either case, the user will have the option to select the exchange endpoint
described above. When the user initiates an issuance flow with that exchange
endpoint selected, the following HTTP communication will take place.

#### VC Playground

VC Playground sends the initial exchange create request.

```http
POST /workflows/<uuid1>/exchanges
Host: my-oid4-service.example
```

#### Exchange Endpoint Response

The exchange endpoint responds with new exchange URL which MUST be a time
limited capability URL (hence ending in a UUID):

```http
HTTP/1.1 200 OK
Location: https://my-oid4-service.example/workflows/<uuid1>/exchanges/<uuid2>
```

#### VC Playground

VC Playground retrieves the protocols object:

```http
GET /workflows/<uuid1>/exchanges/<uuid2>/protocols
Host: my-oid4-service.example
```

#### Exchange Endpoint Response

The exchange endpoint provides the `protocols` object containing the OID4-based
URL for further use by the VC Playground to either pass on to the user selected
Wallet via CHAPI or to show in a QR code:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "protocols": {
    "OID4VCI": "..."
  }
}
```

NOTE: the `OID4VCI` key name above would be `OID4VP` when processing a
verification request.
