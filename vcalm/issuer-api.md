---
title: "Issuer API"
permalink: /vcalm/issuer-api/
sort: 2
---

{% docxDownload %}

This page describes the issuing API of the [Verifiable Credential API for Lifecycle Management](https://w3c.github.io/vcalm/#issuing) (VCALM): the endpoint that issues a credential, the endpoints that read and delete issued credentials, and the status endpoints that an issuer uses to manage credential status. For roles, instances, authorization, options and error handling, see [VCALM](/vcalm/).

> [!note] Paths are relative to an instance
> Each path on this page attaches to an instance. For example, `/credentials/issue` can be at `https://vcalm.example.com/issuers/z1A2b3C.../credentials/issue`. The specification does not define how to create an instance.

## Endpoints

| Method | Path | Operation | Exposed by | Expected caller |
|---|---|---|---|---|
| `POST` | `/credentials/issue` | Issue a credential. | Issuer service | Issuer coordinator, workflow service |
| `GET` | `/credentials/{id}` | Get an issued credential. | Issuer service | Issuer coordinator, holder coordinator, workflow service |
| `DELETE` | `/credentials/{id}` | Delete a stored credential. | Issuer service | Issuer coordinator, holder coordinator |
| `POST` | `/status-lists` | Create a status list. | Status service | Issuer service |
| `GET` | `/status-lists/{id}` | Get a status list credential. | Status service | Public |
| `POST` | `/credentials/status` | Update the status of an issued credential. | Status service | Issuer service |

An issuer service must provide `POST /credentials/issue`. It can also provide the other endpoints in the Issuing section of the specification. A status service must provide `POST /credentials/status`.

For all endpoints except `GET /status-lists/{id}`, the OpenAPI description permits the `networkAuth`, `oAuth2` and `zCap` security schemes. `GET /status-lists/{id}` has no security scheme. See [Authorization](/vcalm/#authorization).

All request and response bodies are JSON, with `Content-Type: application/json`.

## Issue a credential

`POST /credentials/issue` issues a verifiable credential.

```http
POST /issuers/z1A2b3C.../credentials/issue
Host: vcalm.example.com
Content-Type: application/json
```

```json
{
  "credential": {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://www.w3.org/ns/credentials/examples/v2"
    ],
    "id": "https://vcalm.example.com/credentials/3732",
    "type": ["VerifiableCredential", "ExampleDegreeCredential"],
    "validFrom": "2026-01-01T00:00:00Z",
    "credentialSubject": {
      "id": "did:example:holder123",
      "degree": {
        "type": "ExampleBachelorDegree",
        "name": "Bachelor of Science and Arts"
      }
    }
  },
  "options": {
    "mandatoryPointers": ["/issuer", "/validFrom"]
  }
}
```

### Request

| Property | Meaning |
|---|---|
| `credential` | The credential to issue. The OpenAPI description shows only `@context` (an array of strings) and `type` (an array of strings). The data model specifications define the rest. The credential can have an embedded proof. |
| `options` | Optional. The issue options. See the next table. |

**The `issuer` property.** The specification says that the `issuer` in the request should be omitted. If the request has an `issuer`, it must agree with the configuration of the instance. When one endpoint has many configurations, the instance can use `issuer` to select one. A value of `issuer` that does not match the expected configuration is a reason for `400 Bad Request`.

`options` has these properties. The schema has `additionalProperties: false`. Implementations can add [extension options](/vcalm/#options).

| Option | Type | Meaning |
|---|---|---|
| `mandatoryPointers` | array of strings | For selective disclosure: the JSON pointers to the claims that a holder must always reveal. |
| `credentialId` | string | A URI that identifies the issued credential in later API calls. Use it when the credential has no `id`. |

Rules for `credentialId`:

- If the coordinator does not send `credentialId`, the issuer service uses the value of `credential.id`.
- If the request has neither `credentialId` nor `credential.id`, no API call can refer to the credential after issuance, and duplicates cannot be detected.
- The coordinator should not send `credentialId` when the credential has an `id`. Do not use `credentialId` in place of `credential.id`.
- The issuer service should not make a `credentialId` itself when the coordinator does not send one. If the client does not receive the result, a generated value can cause a partitioning error.

### Proofs

If a use case needs more than one proof, the instance must add all of the proofs in one call to `/credentials/issue`.

If the `credential` already has proofs, the configuration of the instance sets the behavior. The specification says that an instance should do one of these:

- **Proof set**: add the new proofs to the existing proofs. If there is one existing proof, convert it to a list first. The new proofs are not bound to the existing proofs.
- **Proof chain**: add the new proofs to make or extend a proof chain, for example with the `previousProof` property.
- **Error**: return an error, when the instance accepts only credentials without proofs.

### Response

`201 Created`: the credential is issued. The body has the secured credential in `verifiableCredential`:

```json
{
  "verifiableCredential": {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://www.w3.org/ns/credentials/examples/v2"
    ],
    "id": "https://vcalm.example.com/credentials/3732",
    "type": ["VerifiableCredential", "ExampleDegreeCredential"],
    "issuer": "did:example:issuer",
    "validFrom": "2026-01-01T00:00:00Z",
    "credentialSubject": {"...": "..."},
    "proof": {
      "type": "DataIntegrityProof",
      "cryptosuite": "ecdsa-rdfc-2019",
      "created": "2026-01-01T00:00:00Z",
      "verificationMethod": "did:example:issuer#key-1",
      "proofPurpose": "assertionMethod",
      "proofValue": "z..."
    }
  }
}
```

The value of `verifiableCredential` is a `VerifiableCredential` or an `EnvelopedVerifiableCredential`.

> [!note] Response schema name
> In the OpenAPI description, the `201` response schema `IssueCredentialResponse` has one property, also named `IssueCredentialResponse`, and its value is the `VerifiableCredentialResponse` object shown above.

**Other media types.** To issue a credential with a media type other than `application/vc`, for example `application/mdoc`, `application/vc+sd-jwt`, `application/vcb;barcode-format=qr_code` or `application/vcb;barcode-format=pdf417`, the response can have an `EnvelopedVerifiableCredential`. Its `id` must be a `data:` URL (RFC 2397) that holds the secured credential. Its `type` must be `EnvelopedVerifiableCredential`.

```json
{
  "verifiableCredential": {
    "@context": "https://www.w3.org/ns/credentials/v2",
    "id": "data:application/vc+sd-jwt;QzVjV...RMjU",
    "type": "EnvelopedVerifiableCredential"
  }
}
```

`400 Bad Request`: the request cannot be processed. For example, the `issuer` value does not match the expected configuration.

## Get an issued credential

`GET /credentials/{id}` returns a credential by its ID. For a credential that has no `credential.id` but has a `credentialId`, use the `credentialId`.

The OpenAPI description allows these formats for `{id}`: a UUID (`f37e5114-8b4a-11ec-b32e-fbd62b9502c1`), a base58 multibase value that starts with `z` (`z4Z1T4HdLdfXCFAhdhzdCqm`), or a base64url multibase value that starts with `u` (`u7m8_ybOArX-EWeADqWCsIw`).

| Status | Meaning |
|---|---|
| `200` | The body is a `VerifiableCredentialResponse`: `{"verifiableCredential": {...}}`. |
| `400` | Bad Request. |
| `401` | Not Authorized. |
| `404` | Credential not found. |
| `410` | Gone. There is no data. |
| `418` | Must not be returned outside of scenarios that both parties arranged. |

## Delete a stored credential

An issuer service or a holder service can store an issued credential for a long time. `DELETE /credentials/{id}` deletes it, for example because a regulation such as the right to be forgotten requires it. For a credential that has no `credential.id` but has a `credentialId`, use the `credentialId`.

| Status | Meaning |
|---|---|
| `202` | Credential deleted. The default is `202` because soft deletes and processing time are expected. |
| `400` | Bad Request. |
| `401` | Not Authorized. |
| `404` | Credential not found. |
| `410` | Gone. There is no data. |

## Credential status

An issuer can manage a status service for credentials that it can revoke. The issuer service calls the status service to create lists and to update status. Verifiers and holders get status list credentials from the status service.

> [!note] The status list operations are non-normative
> The specification calls the create list, get list and set status operations a recommended approach, not a requirement. Implementers can design status list management for their own needs, if the status can be verified with the status mechanism in use, for example [Bitstring Status List](https://www.w3.org/TR/vc-bitstring-status-list/). The conformance section still requires a status service to provide the Update Status endpoint.

### Create a status list

`POST /status-lists` creates a status list credential. A status list is a verifiable credential that holds the status of many credentials. For consistent verification, a status list credential typically uses the same securing mechanism (proof type and cryptosuite) as the credentials that refer to it.

```json
{
  "statusPurpose": "revocation",
  "id": "https://vcalm.example.com/status-lists/abc123"
}
```

| Property | Required | Meaning |
|---|---|---|
| `statusPurpose` | Yes | The purpose of the list, for example `revocation` or `suspension`. |
| `id` | No | A URI for the status list. If you do not send it, the service makes one. |
| `options` | No | Parameters of the status mechanism, for example the list size. The specification does not define them. |

The request schema has `additionalProperties: false`.

`201 Created`: the list is created. The `Location` header is the URL of the status list credential. The body has the list `id` and the status list credential:

```json
{
  "id": "https://vcalm.example.com/status-lists/abc123",
  "verifiableCredential": {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    "id": "https://vcalm.example.com/status-lists/abc123",
    "type": ["VerifiableCredential", "BitstringStatusListCredential"],
    "issuer": "did:example:issuer",
    "validFrom": "2026-01-01T00:00:00Z",
    "credentialSubject": {
      "id": "https://vcalm.example.com/status-lists/abc123#list",
      "type": "BitstringStatusList",
      "statusPurpose": "revocation",
      "encodedList": "H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAACAP2A1AQAAZQAAAIA..."
    },
    "proof": {"type": "DataIntegrityProof", "cryptosuite": "eddsa-rdfc-2022", "...": "..."}
  }
}
```

`400 Bad Request`: the request cannot be processed.

### Get a status list credential

`GET /status-lists/{id}` returns a status list credential. The OpenAPI description says that this endpoint should be publicly accessible without authentication, so that verifiers and holders can get status information.

The service returns the list in a format based on the requested media type or the default format of the service. The response is typically a `VerifiableCredential` or an `EnvelopedVerifiableCredential`, in the same format as the credentials that refer to the list.

| Status | Meaning |
|---|---|
| `200` | The body is the status list credential. |
| `404` | Status list not found. |

> [!note] Privacy
> A verifier that gets status from the status service lets the issuer correlate status checks with verifiers and credentials. The OpenAPI description says that verifiers should get status information from holders instead. The recommended flow: the verifier asks the holder for a presentation, the holder includes the credential and its status list credential or status information, and the verifier checks the status without contact with the issuer.

### Update the status of a credential

`POST /credentials/status` changes the status of an issued credential, for example to revoke or suspend it. The status service updates the entry in the status list credential.

```json
{
  "credentialId": "urn:uuid:0fc754bc-fc32-46a0-aec1-a5ef385e7ea0",
  "credentialStatus": {
    "type": "BitstringStatusListEntry",
    "statusPurpose": "revocation",
    "statusListCredential": "https://vcalm.example.com/status-lists/abc123",
    "statusListIndex": "94567"
  },
  "status": true
}
```

| Property | Required | Meaning |
|---|---|---|
| `credentialId` | Yes | Identifies the credential. The identifier does not have to appear in the credential. |
| `credentialStatus` | Yes | Identifies the status list entry to update. It must have `type` and `statusPurpose`. It can have `id`, `statusListIndex` and `statusListCredential`. It can have no other properties. |
| `status` | Yes | Boolean. The new status. |
| `indexAllocator` | No | Lets services track which indexes are assigned to credentials. |

The request schema has `additionalProperties: false`.

| Status | Meaning |
|---|---|
| `200` | Status updated. |
| `400` | Bad Request. |
| `404` | Credential not found. |
