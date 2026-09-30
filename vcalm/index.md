---
title: "VCALM"
permalink: /vcalm/
sort: 1
---

{% docxDownload %}

The [Verifiable Credential API for Lifecycle Management](https://w3c.github.io/vcalm/) (VCALM) is a W3C specification. It defines a data model and HTTP APIs to issue, verify, present and manage verifiable credentials.

> [!warning] The specification is an Editor's Draft
> VCALM is in active development. The specification itself discourages deployment in production systems, unless you participate in the weekly meetings that coordinate work on it. The details on these pages can change.

These pages describe what the specification defines. They do not describe a specific implementation.

- [Issuer API](/vcalm/issuer-api/): issue credentials and manage their status.

## Roles and components

The Verifiable Credentials Data Model defines three roles: the **issuer**, the **holder** and the **verifier**. VCALM divides the software for each role into components. The architecture is not prescriptive. One software package can serve many roles, and one role can use many packages.

**Coordinators** apply the business rules and policies of a role. A coordinator is often custom software for one party. It connects that party to the verifiable credential ecosystem. Except for the status service, all communication between roles is between coordinators.

| Coordinator | Function |
|---|---|
| Issuer coordinator | Decides who gets which credentials, and how to authenticate and authorize those parties. It drives the issuer service. |
| Verifier coordinator | Sends credentials and presentations to a verifier service to check authenticity and timeliness, then applies the business rules of the verifier. |
| Holder coordinator | Approves the flow of credentials under the control of the holder. Part of it is often called a digital wallet. In this API, the holder coordinator starts all flows. |

**Services** give lower-level functions to their coordinators over HTTP. The specification defines only the HTTP endpoints of services.

| Service | Function |
|---|---|
| Issuer service | Issues verifiable credentials on requests from authorized issuer coordinators. It has access to the keys that make the proofs. The API between the issuer service and its key management service is out of scope. |
| Verifier service | Verifies credentials and presentations, and returns the result of the proof and status checks. |
| Holder service | Makes verifiable presentations. |
| Status service | Publishes and checks the status of the credentials of an issuer, with privacy protection. |
| Storage service | Stores the credentials and data of each actor. |
| Workflow service | Automates specific interactions with exchanges. |
| Administration service | Configures and manages the other components. The specification does not define its interfaces. |

## Conformance

| Implementation | Must provide | Can also provide |
|---|---|---|
| Issuer service | [Issue Credential](https://w3c.github.io/vcalm/#issue-credential) | The other interfaces in [Issuing](https://w3c.github.io/vcalm/#issuing). |
| Verifier service | [Verify Credential](https://w3c.github.io/vcalm/#verify-credential) and [Verify Presentation](https://w3c.github.io/vcalm/#verify-presentation) | The other interfaces in [Verifying](https://w3c.github.io/vcalm/#verifying). |
| Holder service | [Get Exchange Protocols](https://w3c.github.io/vcalm/#get-exchange-protocols) and [Participate in an Exchange](https://w3c.github.io/vcalm/#participate-in-an-exchange) | Other protocols, query languages and data formats in the specification. |
| Status service | [Update Status](https://w3c.github.io/vcalm/#update-status) | |
| Workflow service | All interfaces in [Workflows and Exchanges](https://w3c.github.io/vcalm/#workflows-and-exchanges) | |

A service client implementation must be able to call all required interfaces of the related service. All implementations can provide functions that the specification does not define.

## Instances and configurations

The APIs attach to an **instance**. An administrator sets up each instance with a configuration. When a client calls an endpoint on an instance, the instance uses its configuration and the options from the client.

For example, an issuer instance can provide `/credentials/issue` at `/instances/12345/credentials/issue`. The configuration of that instance sets the key, the status list (if any), the credential type, the credential format and the options that the endpoint accepts.

The specification does not define how to create or configure an instance. Configuration is mostly out of scope. An implementation can use configuration files, graphical interfaces or HTTP APIs. The workflow configuration in [Create Workflow](https://w3c.github.io/vcalm/#create-workflow) is the main exception. The specification also does not define how a coordinator discovers the configuration of an instance at runtime. The coordinator knows its instances when it is deployed.

**Base URL.** The specification puts no restrictions on the base URL of an instance. The paths on these pages are absolute paths. The base URL can be a host name (`website.example`), a subdomain (`api.website.example`) or a path (`website.example/api`).

## Authorization

Each endpoint says if it needs authorization. The API does not require a specific authorization mechanism, but it forbids one class of mechanisms. The specification names three classes of use case:

- **Public**: the endpoint needs no authorization.
- **Permissioned**: the caller has, for example, an access token or a capability URL, or it invokes a capability from a source that both parties trust.
- **Bound**: the call is bound to another process, often out-of-band, that authenticated the holder or subject. Examples are CHAPI, OpenID Connect and GNAP.

> [!warning] Forbidden authorization
> Requests to this API must not use an authorization protocol that sends long-lived static credentials, such as a user name and password. HTTP Basic Authentication is an example of a forbidden protocol.

The specification gives examples of two mechanisms. Other equivalent mechanisms are permitted. The specification advises against non-standard or legacy mechanisms.

The OpenAPI description of each endpoint lists the permitted security schemes. For the issuing endpoints, these are `networkAuth` (source IP access rules), `oAuth2` and `zCap`. The OpenAPI description also defines a `didAuth` scheme.

### Authorization capabilities (ZCAPs)

If you use ZCAPs, the administrator delegates a ZCAP in the format of the [ZCAP specification](https://w3c-ccg.github.io/zcap-spec/). The ZCAP sets the controller, the invocation target and the allowed actions.

- The `read` action permits operations that do not create or update resources, on the invocation target and on any path that starts with it.
- The `write` action permits operations that create or update resources, on the invocation target and on any path that starts with it.
- The specification maps the HTTP method to the action, for example `GET` to `read` and `POST` to `write`.

The specification expects implementers to follow the principle of least privilege: pin each ZCAP to a specific URL with `invocationTarget` and to a specific client with `controller`. For example, a ZCAP for an issuer coordinator or a workflow service that must only issue credentials:

```json
{
  "controller": "did:key:z6MkExampleCoordinator",
  "invocationTarget": "https://vcalm.example.com/issuers/z1A2b3C.../credentials/issue",
  "allowedAction": ["write"]
}
```

A full delegated ZCAP also has `@context`, `id`, `parentCapability`, `expires` and a `proof` with `proofPurpose: "capabilityDelegation"` and a `capabilityChain`.

### OAuth 2.0

If you use OAuth 2.0, the access tokens are OAuth 2.0 Bearer Tokens or another valid OAuth 2.0 token type. Any valid grant type can get the tokens. A scope has this syntax:

```
scope     = operation ":" path-absolute
operation = "read" / "write"
```

The `read` and `write` operations have the same meaning as the ZCAP actions. The specification expects these practices:

- A JSON Web Token (JWT) access token has an `aud` claim that identifies the instance, for example `https://vcalm.example.com/issuers/z1A2b3C...`.
- The scope has the full API path, without the domain and the instance. For example, `write:/credentials/issue` permits a client to issue credentials on the instance in `aud`.
- Keep scopes narrow. Broad scopes such as `read:/` and `write:/` can cause security problems when many instances share one service.

## Options

Some endpoints accept an `options` object.

- All `options` properties are optional when you configure an instance. An instance configuration can prohibit some properties, and it can require some properties.
- Implementations can add properties to `options`. The specification advises that these extension properties are not mandatory, so that clients do not need changes for one implementation.
- An implementation must return an error if an endpoint receives data, options or option values that it does not understand or cannot process.

## Content serialization

All request and response bodies must be JSON, with the `Content-Type` header set to `application/json`.

The OpenAPI description shows credentials and presentations with only `@context` and `type`. The data model specifications define their full content. The schema names `Credential` and `Presentation` identify input documents, and `VerifiableCredential` and `VerifiablePresentation` identify secured documents. For other serializations, the API uses `EnvelopedVerifiableCredential` and `EnvelopedVerifiablePresentation`.

**Payload sizes.** The specification recommends a default maximum of 10 MB for each verifiable credential. An implementation can configure a larger size. By default, link large binary values and include their hash, unless privacy is a reason not to.

## Error handling

An implementation can report a problem with a **ProblemDetails** object, as defined in RFC 9457:

| Property | Rule |
|---|---|
| `type` | Must be present. A URL that identifies the type of problem. |
| `title` | Should be present. A short, specific description. |
| `detail` | Should be present. A longer description. |

The specification encourages `detail` and `instance` to give context, but without sensitive information. It strongly advises implementations to sanitize all server errors in production.

```json
{
  "type": "https://www.w3.org/TR/vc-data-model#CRYPTOGRAPHIC_SECURITY_ERROR",
  "status": 400,
  "title": "CRYPTOGRAPHIC_SECURITY_ERROR",
  "detail": "The cryptographic security mechanism couldn't be verified. This is likely due to a malformed proof or an invalid verificationMethod."
}
```

VCALM defines one problem type: `https://www.w3.org/TR/vcalm#UNKNOWN_OPTION_PROVIDED`, for an option that the implementation does not know. The VC Data Model 2.0, VC Data Integrity and Bitstring Status List specifications define more problem types.

For verification, the specification recommends that implementations collect ProblemDetails objects in the verification result instead of raising errors. Errors (cryptography, data model, malformed context) cannot be recovered. Warnings (status, validity period) can be recovered, or the application decides. If a result has an error, `verified` must be `false`. If it has no errors, `verified` must be `true`.
