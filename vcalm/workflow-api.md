---
title: "Workflows and Exchanges"
permalink: /vcalm/workflow-api/
sort: 3
---

{% docxDownload %}

This page describes the workflows and exchanges API of the W3C [Verifiable Credentials API for Lifecycle Management](https://www.w3.org/TR/vcalm/) (VCALM) specification. It covers the workflow model, every workflow, exchange and interaction route in the specification, the exchange lifecycle, and the specification's step and template examples. For the other parts of VCALM, see [VCALM](/vcalm/).

The wallet side of an exchange is on other pages. [Handling a VC API Exchange](/chapi/wallets/exchanges/) and [QR Code / Interaction URL Flow](/chapi/wallets/interaction-url/) describe what a wallet sends and receives. This page describes the whole API, with the workflow service at the center.

The key words MUST, SHOULD and MAY on this page have the meanings that the specification gives them. When the specification leaves a choice to implementations, this page says so.

---

## Concepts

A **workflow** is a set of steps for exchanging verifiable credentials between two parties across a trust boundary. Each step can issue, verify, send or present verifiable credentials. A workflow can be a linear sequence of steps, or it can use branches and repeated steps.

A **workflow instance** is created by an administrator on a **workflow service**, with an HTTP `POST` to `/workflows`. The configuration contains the steps and any credential templates. If the workflow issues credentials or verifies presentations, the configuration can include authorization capabilities to use one or more issuer or verifier services.

An **exchange** is one interaction that is based on a workflow. It takes place between an **exchange client** (for example a digital wallet) and the workflow service. Exchanges are expected to be transitory: they exist only for as long as the interaction takes. The workflow service stores the state of each exchange: whether it is pending, active or complete, the current step, workflow variables and data, and any presentations and credentials that it received.

A **coordinator** (issuer, verifier or holder coordinator) creates exchanges. It sends a `POST` to the `/exchanges` path of a workflow. It receives an **exchange URL** and gives it to the exchange client. After that, the coordinator is not part of the exchange. A coordinator can also run its own exchange client if a use case needs it.

An **interaction URL** is a URL that a coordinator gives to another party to start an interaction, for example in a QR code. The other party fetches it and gets a `protocols` object that lists the ways to continue. See [Initiating interactions](#initiating-interactions).

A "local" ID is local to a service instance. `workflowId` and `exchangeId` are complete URLs. `localWorkflowId` and `localExchangeId` are path segments in those URLs. This page uses these placeholders:

| Placeholder | Example |
|---|---|
| `<workflowId>` | `https://workflows.example.com/workflows/z1A2exampleWorkflow` |
| `<exchangeId>` | `https://workflows.example.com/workflows/z1A2exampleWorkflow/exchanges/z1A2exampleExchange` |

The specification puts no restrictions on the base URL of an instance. The base URL can be a host name, a subdomain, or a path in a domain.

### Who calls what

The specification names the expected caller of each route:

| Route | Expected caller |
|---|---|
| `POST /workflows` | Administrators |
| `GET /workflows/{localWorkflowId}` | Administrators |
| `POST /workflows/{localWorkflowId}/exchanges` | Coordinator |
| `GET /workflows/{localWorkflowId}/exchanges/{localExchangeId}` | Coordinator |
| `POST /workflows/{localWorkflowId}/exchanges/{localExchangeId}` | Anyone |
| `GET /workflows/{localWorkflowId}/exchanges/{localExchangeId}/protocols` | Verifier coordinator, holder coordinator |
| `GET /workflows/{localWorkflowId}/exchanges/{localExchangeId}/request` | Anyone with the URL |
| `POST /callbacks/{localCallbackId}` | Workflow service |
| `GET /interactions/{interactionId}` | Anyone with the URL |
| `POST /{inviteId}/invite-request/response` | The party that fetched the interaction URL |
| `POST /challenges` | Verifier coordinator, workflow service |

The workflow service exposes the `/workflows` routes. Coordinators expose `/interactions/{interactionId}` and `/callbacks/{localCallbackId}`. A verifier service exposes `/challenges`.

---

## Authorization

VCALM does not choose one authorization mechanism. Each route in the specification lists these security schemes: network access rules, OAuth2 and authorization capabilities (zcaps). Requests MUST NOT use an authorization protocol that sends long-lived static credentials, such as usernames and passwords. HTTP Basic Authentication is an example of a forbidden protocol.

For exchanges, the specification says:

- To start an exchange, the exchange client needs no authorization other than the exchange URL. Depending on the implementation, exchange URLs can be capability URLs: unguessable secrets, so that only the parties that receive the URL can start the exchange.
- If the workflow needs more authorization than possession of the exchange URL, the workflow gets it during the exchange, not when the exchange starts.
- A coordinator can use the exchange URL to read the state of the exchange. This needs additional authorization that the coordinator has and the exchange client does not have.

A workflow configuration can include `controller`, the root controller for zcap-based authorization, and `authorization.oauth2.issuerConfigUrl`, an OAuth2 configuration. It can use both at the same time.

---

## The workflow configuration

The body of `POST /workflows` has these properties:

| Property | Required | Meaning |
|---|---|---|
| `id` | OPTIONAL | The ID of the new workflow. |
| `initialStep` | REQUIRED | The name of the step in `steps` that an exchange starts on. |
| `steps` | REQUIRED | An object. Each key is a step name, for example `request-employee-id`. Each value is a step. |
| `credentialTemplates` | OPTIONAL | An array of credential templates. |
| `controller` | OPTIONAL | The root controller of the instance, for authorization systems such as zcaps. |
| `authorization` | OPTIONAL | Authorization information, for example `{"oauth2": {"issuerConfigUrl": "<url>"}}`. |

The "Required" column follows the property descriptions in the specification's OpenAPI definition. The schema has `additionalProperties: false`. The specification's appendix examples also contain `sequence`, `zcaps` and `meterId`, which the schema does not list. How a workflow receives its issuer and verifier capabilities is left to implementations.

### Credential templates

A credential template is an object:

| Property | Meaning |
|---|---|
| `id` | The ID of the template. An issue request can refer to it. |
| `type` | The template type. The specification defines `jsonata`. Other types are possible. |
| `template` | The template text. |

The template SHOULD render to an object that has a `credential` property (the credential) and, optionally, an `options` property (issue options). This is the format of the request body of `POST /credentials/issue`.

### Steps

A step is one of two forms, but not both:

- **Step data**: an object with the properties in the table below.
- **Step template**: `{"stepTemplate": {"type": "<template type>", "template": "<template>"}}`. The template renders to step data.

| Step property | Meaning |
|---|---|
| `verifiablePresentationRequest` | A verifiable presentation request to send to the exchange client. |
| `createChallenge` | An optional directive. The exchange handles the challenge through a VCALM verifier service that it has a zcap for. |
| `verifiablePresentation` | A step MAY include a verifiable presentation to use in the step. It can be composed from other exchange variables, and the credentials that the step issues can be added to it. Use it when a use case needs a specific presentation version, sub-type or content, or to deliver credentials that were issued out of band. |
| `issueRequests` | An array of issue requests. See below. |
| `presentationSchema` | A schema that the received presentation must satisfy. For JSON Schema, `type` MUST be `JsonSchema` and `jsonSchema` contains the schema. Other schema types are possible but out of scope. |
| `verifyPresentationResponseSchema` | A schema for the result of verifying the presentation. Same form as `presentationSchema`. |
| `redirectUrl` | OPTIONAL. A URL to send to the client to continue the interaction at another location. |
| `callback` | `{"url": "<url>"}`. A callback that is called after the step executes. See [Exchange step callbacks](#exchange-step-callbacks). |
| `nextStep` | OPTIONAL. The name of the next step. It MUST NOT be present on the final step. |
| `openId` | Options to enable OID4VCI or OID4VP. See [OpenID options](#openid-options). |

An issue request identifies a credential template by `credentialTemplateId` (the template's `id`) or by `credentialTemplateIndex` (its index in `credentialTemplates`). It MAY also include:

- `variables`: the values to use when the template is evaluated. It is either the name of a variable in the exchange variables, or an object with other variables.
- `result`: where to store the result of the issue request. The value MUST be the name of a top-level exchange variable, or a JSON pointer to any variable in the exchange variables.

By default, the result of each issue request is included in the verifiable presentation that the step sends to the exchange client. With `result`, the credential is stored instead. A later step can use the stored credential, or a party with access to the exchange state can get it after the exchange ends.

A step MAY include `redirectUrl` to send the client back to a coordinator website after the exchange, or to return an interaction URL. If the client recognizes an interaction URL (for example, it has `?iuv=1`), it can fetch it. The interaction server can then run its own business rules and return a `protocols` object with another exchange.

### Variables and results

An exchange has a `variables` object. The coordinator supplies variables when it creates the exchange, and templates read them. Implementations can use any variables in addition to the reserved ones.

`results` is a reserved variable. It holds the data that the workflow service receives from clients during the exchange, by step name: `results.<stepName>`. The specification defines these step results:

| Result | Meaning |
|---|---|
| `verifiablePresentation` | The presentation that the step received. |
| `openId.clientProfileId` | The OID4VCI or OID4VP client profile that the exchange client selected. |
| `openId.authorizationResponse` | The credential-bearing response that the holder sent. |
| `openId.presentationSubmission` | The mapping between input descriptors and credentials that the holder submitted. |
| `inviteRequest.inviteResponse` | The invite response: `url`, `purpose` and `referenceId`. |

A credential template can refer to results, for example `results.didAuthRequest.verifiablePresentation.holder`.

The specification sets no technical limit on the number of steps. Implementations might want to enforce a default maximum to prevent bugs.

### OpenID options

`openId` is one OpenID client profile, or `{"clientProfiles": {"<profileId>": {...}}}` with more than one profile. A client profile MUST have one of these, but not both:

- `createAuthorizationRequest`: where to store an OID4VP authorization request that the service generates. The value MUST be the name of a top-level exchange variable, or a JSON pointer to any variable in the exchange variables. The value can be generated lazily, when the exchange client selects OID4VP. This lets the service reuse values, for example a verifiable presentation request, across more than one protocol.
- `authorizationRequest`: a complete OID4VP authorization request.

A client profile can also contain these overrides for the authorization request: `client_id`, `client_id_scheme` (from OID4VP draft 18, for backwards compatibility), `client_metadata`, `nonce`, `dcql_query`, `presentation_definition`, `response_mode`, `response_uri` and `redirect_uri`. Other properties:

| Property | Meaning |
|---|---|
| `authorizationRequestSigningParameters` | `{"x5c": [...]}`: parameters to sign authorization requests. `x5c` is required. |
| `protocolUrlParameters` | `{"name": "...", "scheme": "..."}`: the name and scheme of the OID4VCI or OID4VP URL. Both are required. |
| `zcapReferenceIds` | `{"signAuthorizationRequest": "..."}`: a reference to a zcap that signs authorization requests. |

This is an example of an OID4VP authorization request, from the specification:

```json
{
  "response_type": "vp_token",
  "presentation_definition": {
    "id": "f1bd224a-0fed-469a-b64a-dad7cf63fd98",
    "input_descriptors": [{
      "id": "77d50c71-95ef-442c-a372-f32e17634fab",
      "constraints": {
        "fields": [
          {"path": ["$['@context']"], "filter": {"type": "array", "contains": {"type": "string", "const": "https://www.w3.org/ns/credentials/v2"}}},
          {"path": ["$['type']"], "filter": {"type": "array", "contains": {"type": "string", "const": "VerifiableCredential"}}},
          {"path": ["$['credentialSubject']['name']"], "filter": {"type": "string"}}
        ]
      },
      "purpose": "We require a name credential to display your name when you post messages."
    }]
  },
  "response_mode": "direct_post",
  "client_id": "https://workflows.example.com/workflows/z1A2exampleWorkflow/exchanges/z1A2exampleExchange/openid/client/authorization/response",
  "client_id_scheme": "redirect_uri",
  "response_uri": "https://workflows.example.com/workflows/z1A2exampleWorkflow/exchanges/z1A2exampleExchange/openid/client/authorization/response",
  "nonce": "z1A2exampleExchange"
}
```

The specification does not define the OID4VCI and OID4VP routes of an exchange. The `protocols` object gives their URLs. See the [OID4VCI](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html) and [OID4VP](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html) specifications.

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/workflows` | Create a workflow |
| `GET` | `/workflows/{localWorkflowId}` | Get a workflow configuration |
| `POST` | `/workflows/{localWorkflowId}/exchanges` | Create an exchange |
| `GET` | `/workflows/{localWorkflowId}/exchanges/{localExchangeId}` | Get the exchange state |
| `POST` | `/workflows/{localWorkflowId}/exchanges/{localExchangeId}` | Participate in an exchange |
| `GET` | `/workflows/{localWorkflowId}/exchanges/{localExchangeId}/protocols` | Get the exchange protocols |
| `GET` | `/workflows/{localWorkflowId}/exchanges/{localExchangeId}/request` | Get the current verifiable presentation request |
| `POST` | `/callbacks/{localCallbackId}` | Receive an exchange step callback (on a coordinator) |
| `GET` | `/interactions/{interactionId}?iuv=1` | Get the interaction protocols (on a coordinator) |
| `POST` | `/{inviteId}/invite-request/response` | Send an invite response |
| `POST` | `/challenges` | Create a challenge (on a verifier service) |

The specification defines no routes to list, update or delete workflows. Local IDs in the path match the pattern `[a-z0-9][a-z0-9\-]{2,}`.

### Create a workflow

```http
POST /workflows
Host: workflows.example.com
Content-Type: application/json
```

The body is the [workflow configuration](#the-workflow-configuration). Responses:

| Status | Meaning |
|---|---|
| `201` | The workflow was created, with data. The `Location` header is the URL of the workflow. |
| `204` | The workflow was created, without data. The `Location` header is the URL of the workflow. |
| `400` | Invalid input. |
| `401` | Not authorized. |
| `500` | Internal error. |

### Get a workflow configuration

`GET /workflows/{localWorkflowId}`. The `200` response body is the workflow configuration: `id`, `initialStep`, `controller`, `authorization`, `credentialTemplates` and `steps`. Other responses: `400`, `401`, `500`.

### Create an exchange

```http
POST /workflows/z1A2exampleWorkflow/exchanges
Host: workflows.example.com
Content-Type: application/json

{
  "expires": "2026-10-01T12:15:00Z",
  "variables": {
    "verifiablePresentationRequest": {
      "query": [{"type": "DIDAuthentication", "acceptedMethods": [{"method": "key"}]}],
      "domain": "https://app.example.com"
    },
    "callbackUrl": "https://app.example.com/callbacks/z1A2exampleCallback"
  }
}
```

| Property | Meaning |
|---|---|
| `expires` | The date and time when the exchange expires, as an XML Schema `dateTimeStamp`. |
| `variables` | The variables for this exchange. Templates read them. |
| `openId` | Options to enable OID4VCI or OID4VP for this exchange. Same form as a step's [`openId`](#openid-options). |

Responses: `201` (created, with data) or `204` (created, without data), with the exchange URL in the `Location` header. Other responses: `400`, `401`, `500`.

`expires` also sets the lifetime of challenges: if a challenge is bound to an exchange, the challenge is not valid after the exchange's `expires` time.

### Get the exchange state

`GET /workflows/{localWorkflowId}/exchanges/{localExchangeId}`. The coordinator calls this route with its own authorization. The `200` response body has these properties:

| Property | Meaning |
|---|---|
| `id` | The local exchange ID. |
| `sequence` | A sequence number. It is `0` when the exchange is created. |
| `expires` | The expiry date and time. |
| `step` | The current step. |
| `state` | `pending`, `active`, `complete` or `invalid`. It is `pending` when the exchange is created. |
| `lastError` | A [ProblemDetails](#errors) object. |
| `variables` | The exchange variables, with `results`. |

Other responses: `400`, `401`, `500`.

### Participate in an exchange

`POST /workflows/{localWorkflowId}/exchanges/{localExchangeId}`. The exchange client sends a message and the workflow service answers with a message. Each message is a JSON object with zero or more of these properties:

| Property | Meaning |
|---|---|
| `verifiablePresentation` | A verifiable presentation, or an array of them. Either party uses it to give information: because the other party asked for it, or as an offer. |
| `verifiablePresentationRequest` | A verifiable presentation request. Either party uses it to ask the other party for information. |
| `redirectUrl` | A URL to continue the interaction at another location. |
| `referenceId` | An identifier to correlate messages. A server MAY include it. If the client receives it, the client SHOULD include it in its next message. The value SHOULD be a `urn:uuid` value. |

Custom properties are possible, but implementations that do not recognize them are expected to return errors.

To start an exchange, the client sends a `POST` with a JSON object. If the client has nothing to request, the object is empty (`{}`). An empty body starts the exchange, or returns what the exchange expects to complete the next step. The service answers with its own JSON object:

| Server response | Meaning |
|---|---|
| `{}` | The exchange is complete. Nothing is requested from or offered to the client. |
| `verifiablePresentationRequest` | The exchange is not complete. The service asks for more information. |
| `verifiablePresentation` | The service offers information, for example credentials issued to the holder, or credentials about the service operator that the client asked for. |
| `redirectUrl` | The exchange is complete. The service recommends that the client continues at this URL. |

A server MAY send an interaction URL as `redirectUrl`, to invite the client to start another exchange. A client that understands interaction URLs MAY fetch the protocols and start that exchange. A client that does not MAY open the URL in a browser, where an HTML page MAY show the next steps.

A client MAY also send `redirectUrl` with an interaction URL, to invite the server to become the client of a related exchange. A server MAY engage with it.

The client can also send a `verifiablePresentationRequest`. The server then answers with a 4xx error, one or more presentations, or a presentation request that conforms to the client's request. If the server sends presentations, it can also send a new request to continue the exchange.

When the workflow service does not accept a message, it answers with a `4xx` status and a JSON object that describes the error. The route's documented responses are `200`, `400`, `401` and `500`.

### Get the exchange protocols

`GET /workflows/{localWorkflowId}/exchanges/{localExchangeId}/protocols`. The `200` response lists the protocols that the exchange supports:

```json
{
  "protocols": {
    "vcapi": "https://workflows.example.com/workflows/z1A2exampleWorkflow/exchanges/z1A2exampleExchange"
  }
}
```

The keys are the protocol identifiers in [Interaction protocols](#interaction-protocols). A website can use this route to delegate the exchange to a service provider through the HTTPS domain. For example, `app.example.com` can list protocol URLs on `saas.example.com`. The wallet then relies on its trust in `app.example.com`, in the same way that a web page loads resources from other domains.

### Get the current verifiable presentation request

`GET /workflows/{localWorkflowId}/exchanges/{localExchangeId}/request`. When the request has `Accept: application/json`, this route MUST return the current verifiable presentation request of the exchange:

```json
{
  "verifiablePresentationRequest": {
    "query": [{"type": "DIDAuthentication", "acceptedMethods": [{"method": "key"}]}],
    "domain": "https://app.example.com",
    "challenge": "3182bdea-63d9-11ea-b6de-3b7c1404d57f"
  }
}
```

If the current step has no request, the value of `verifiablePresentationRequest` MUST be an empty object. This request SHOULD NOT advance the exchange to a new step, and SHOULD NOT cause state changes such as credential issuance.

This route can help integration with the [Digital Credentials API](https://www.w3.org/TR/digital-credentials/). To make a Digital Credentials API request backed by VCALM, the coordinator MUST provide the interaction URL as the request data. The browser MUST then fetch the interaction URL, get the protocols, and send `GET` to the `vcapi` URL with `/request` added. The route MAY rely on TLS and does not need signed requests. The specification says that the final design of this function is not yet decided.

### Exchange step callbacks

`POST /callbacks/{localCallbackId}` is a route that a coordinator can expose to be notified when an exchange step executes. The workflow service calls it with this body:

```json
{
  "event": {
    "data": {
      "exchangeId": "https://workflows.example.com/workflows/z1A2exampleWorkflow/exchanges/z1A2exampleExchange"
    }
  }
}
```

`exchangeId` is a URL that the coordinator can use to get the current state of the exchange. The response is `200` if the callback data was received and `400` if it was not.

The callback URL SHOULD be a capability URL, so that only the parties that receive it can use it, without authorization tokens, token refresh or client registration. If the URL uses the `localCallbackId` form, the `localCallbackId` MUST express at least 128 bits of random information. The specification recommends a new callback URL for each exchange, used only by that exchange.

### Create a challenge

`POST /challenges` with an empty body, on a verifier service. The `200` response is `{"challenge": "<value>"}`. The verifier instance should track how many times the challenge is passed to verification routes as `options.challenge`. A step with `createChallenge: true` uses a verifier service in this way.

### Invite request response

`POST /{inviteId}/invite-request/response`. When an implementation implements the full specification, `inviteId` is the exchange ID and the route is on the workflow service. The body:

```json
{
  "url": "https://app.example.com/checkout/8372974",
  "purpose": "Checkout at the Utopia University store",
  "referenceId": "417bcaf2-14d9-11f0-99d7-9f094678517b"
}
```

`url`, `purpose` and `referenceId` are required. `url` is where the recipient can continue the interaction. `purpose` is a human-readable reason that a consent screen can show. `referenceId` identifies this invite response, mostly for debugging. The specification sets no format for `url`, but it recommends a unique ID in it.

A `200` response means that the service received and understood the invite response. It does not mean that the interaction will continue. A `400` response means invalid input.

---

## The exchange lifecycle

1. A coordinator creates an exchange, with an `expires` time and variables. The exchange `state` is `pending` and `sequence` is `0`.
2. The coordinator gives the exchange URL, or an interaction URL, to the exchange client.
3. The exchange client starts the exchange with a `POST`, usually with `{}`.
4. The client and the service send messages until one side ends the exchange.
5. The coordinator can read the exchange state, and can receive step callbacks.

The specification defines four states: `pending`, `active`, `complete` and `invalid`. It does not define the transitions between them in detail.

A single interaction with an exchange is expected to be short. For longer or multi-stage interactions, for example when an issuer must process a request before the credential is ready, use other mechanisms such as SMS, email, web notifications or phone calls to tell the holder.

This diagram shows a standard exchange from the specification:

{% mermaid %}
sequenceDiagram
    participant H as Holder
    participant W as Holder coordinator (wallet)
    participant I as Issuer or verifier
    H->>W: Start exchange
    W->>I: POST exchange URL {}
    I->>W: verifiablePresentationRequest
    W->>I: POST exchange URL {verifiablePresentation}
    I->>W: verifiablePresentation, a new request, or an error
{% endmermaid %}

The specification also shows two other forms. In the first, the client starts with its own request (for example, proof that the server operator is a registered business). The server answers with a presentation and a request, and the exchange ends with a presentation or `{}`. In the second, the client sends a counter-request after the server's first request.

A client can start with a request that states which proof formats it accepts:

```json
{
  "verifiablePresentationRequest": {
    "query": [{
      "type": "QueryByExample",
      "credentialQuery": {
        "acceptedCryptosuites": [
          {"cryptosuite": "eddsa-rdfc-2022"},
          {"cryptosuite": "ecdsa-rdfc-2019"},
          {"cryptosuite": "bbs-2023"}
        ],
        "acceptedEnvelopes": [{"mediaType": "application/jwt"}]
      }
    }]
  }
}
```

If `credentialQuery` has no `example`, the client accepts any credentials that match the formats.

### Errors

An implementation can use a ProblemDetails object ([RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)) to report a problem:

| Property | Rule |
|---|---|
| `type` | MUST be present. A URL that identifies the type of problem. |
| `title` | SHOULD give a short, specific, human-readable string. |
| `detail` | SHOULD give a longer human-readable string. |

```json
{
  "type": "https://www.w3.org/TR/vc-data-model#CRYPTOGRAPHIC_SECURITY_ERROR",
  "status": 400,
  "title": "CRYPTOGRAPHIC_SECURITY_ERROR",
  "detail": "The cryptographic security mechanism couldn't be verified. This is likely due to a malformed proof or an invalid verificationMethod."
}
```

The specification defines the type `https://www.w3.org/TR/vcalm#UNKNOWN_OPTION_PROVIDED`: an option that the implementation does not know. The `lastError` of an exchange is a ProblemDetails object. Implementers are strongly advised to sanitize server errors in production, because unsanitized errors can disclose information.

---

## Requests in a step

A step's `verifiablePresentationRequest` has this form:

| Property | Rule |
|---|---|
| `query` | REQUIRED. One or more objects. Each MUST have a `type` string. |
| `domain` | OPTIONAL. The security domain, for example a website domain. The holder checks that it matches the domain that it communicates with, and includes it in the presentation. It protects the verifier against replay attacks. |
| `challenge` | OPTIONAL. A unique string. The holder includes it in the presentation. It protects the verifier against replay attacks. |

The specification defines two query types that workflows often use:

- `QueryByExample`: asks for credentials by example, with optional `reason`, `example`, `acceptedIssuers`, `acceptedCryptosuites` and `acceptedEnvelopes`. See [QueryByExample](/chapi/wallets/querybyexample/).
- `DIDAuthentication`: asks the holder to prove control of a DID. `type` MUST be `DIDAuthentication`. `acceptedMethods` lists the DID methods that the verifier accepts.

A DID Authentication response MUST be a verifiable presentation with `type` `VerifiablePresentation`, a `holder` DID of a requested type, and a `proof`. Each proof MUST include the `domain` and `challenge` of the request. Holder implementations MUST make sure that the `domain` matches the domain of the current communication channel. If a holder does not check this, a malicious verifier can replay the response to another domain.

```json
{
  "@context": ["https://www.w3.org/ns/credentials/v2"],
  "type": "VerifiablePresentation",
  "holder": "did:example:12345",
  "proof": {
    "type": "DataIntegrityProof",
    "cryptosuite": "eddsa-rdfc-2022",
    "verificationMethod": "did:example:12345#key-1",
    "challenge": "99612b24-63d9-11ea-b99f-4f66f3e4f81a",
    "domain": "example.com",
    "created": "2024-02-25T14:58:42Z",
    "proofPurpose": "authentication",
    "proofValue": "z3FXQjecWufY46...UAUL5n2Brbx"
  }
}
```

---

## Initiating interactions

Initiating an interaction tells another implementation which protocols you support and how to start. The approach does not depend on use case, application or protocol. It works over any medium, for example a web browser, a QR code or NFC.

A typical issuer flow: the holder clicks "Receive credential" on the issuer coordinator's website. The coordinator creates an exchange on the workflow service and shows a QR code with an interaction URL. The wallet scans it, fetches the protocols, selects one (for example `vcapi`), starts the exchange on the workflow service, and gets the holder's consent. A verifier flow is the same, with a request for credentials. In a holder flow, the wallet makes the interaction URL, and the verifier scans it and uses the `inviteRequest` protocol.

### Interaction URL format

- The interaction URL MUST conform to the URL Standard and MUST contain an `iuv` query parameter with the interaction URL version. For this version of the API, the value MUST be `1`.
- It SHOULD be an HTTPS URL with an interaction-specific identifier.
- It SHOULD be opaque: the receiving system fetches it without URL syntax processing. Only the `iuv` parameter has meaning.
- Implementers SHOULD NOT put information in the query parameters that the protocols response can give.

```
https://app.example.com/interactions/z8n38Dp7a?iuv=1
```

A coordinator can put the interaction URL at any location on its web origin. The specification says that the coordinator, not the workflow service, hosts the interaction URL. Then consumers can use the coordinator's web origin (its DNS name) as a consistent trust signal and apply business rules to it.

### QR codes and URL schemes

An interaction QR code MUST be an interaction URL, encoded as a QR code according to ISO/IEC 18004. The URL SHOULD be as short as possible, SHOULD NOT be longer than 400 alphanumeric characters, and MUST NOT be longer than 4,296 alphanumeric characters.

To open an application that processes interaction URLs, the specification defines the schemes `interaction:` (native apps) and `web+interaction:` (web apps), followed by the interaction URL:

```
interaction:https://app.example.com/interactions/z8n38Dp7a?iuv=1
web+interaction:https://app.example.com/interactions/z8n38Dp7a?iuv=1
```

### Interaction protocols response

`GET /interactions/{interactionId}?iuv=1`. When the interaction URL is fetched with `Accept: application/json`, the response MUST be one JSON object with a `protocols` map. Each key is a protocol identifier and each value is a URL that starts the interaction:

```json
{
  "protocols": {
    "inviteRequest": "https://saas.example.com/workflows/123/exchanges/987/invite-request/response",
    "vcapi": "https://saas.example.com/workflows/123/exchanges/987"
  }
}
```

When the interaction URL is fetched with any other `Accept` value, the response MUST be a `text/html` document that tells a person to use software that can process interaction URLs.

A coordinator can implement the interaction URL as a pass-through to the `/protocols` route of an exchange. For example, `GET https://app.example.com/interactions/z8n38Dp7a?iuv=1` can return the response of `GET https://app.example.com/workflows/123/exchanges/987/protocols`.

The documented responses are `200`, `400`, `401` and `500`.

### Interaction protocols

| Identifier | Use | Value |
|---|---|---|
| `interact` | Send the wallet to a different interaction URL, where the exchange continues. Exchanges can use it to delegate. | An interaction URL |
| `inviteRequest` | Ask the remote system for an invitation. | The URL of a website for a use-case-specific interaction |
| `vcapi` | Start an exchange with this API. | The exchange ID (the complete exchange URL) |
| `didcomm` | Start an issuance or presentation flow with DIDComm. | The DIDComm Out-of-Band invitation URL |
| `oid4vci-1.0` | Start an issuance flow with OID4VCI 1.0. | The authorization endpoint for the exchange |
| `oid4vp-1.0` | Start a presentation flow with OID4VP 1.0. | The authorization endpoint for the exchange |
| `OID4VCI` | Deprecated, unversioned form of the `oid4vci` identifiers. Use it only for a transition period. | |
| `OID4VP` | Deprecated, unversioned form of the `oid4vp` identifiers. Use it only for a transition period. | |

Because draft versions of OID4VCI and OID4VP differ from version 1.0, the specification advises versioned identifiers, in the pattern `PROTOCOL-MAJOR.MINOR`: for example `oid4vp-1.0` or `oid4vp-draft28`.

### The inviteRequest and vcapi protocols

If a party selects `inviteRequest`, it sends an HTTP `POST` with the [invite response](#invite-request-response) to tell the remote system where to send the person.

If a party selects `vcapi`, it starts the exchange as in [Participate in an exchange](#participate-in-an-exchange). The first response can be a request, for example:

```json
{
  "verifiablePresentationRequest": {
    "query": [{
      "type": "QueryByExample",
      "credentialQuery": {
        "reason": "Please provide your student ID.",
        "example": {
          "@context": [
            "https://www.w3.org/ns/credentials/v2",
            "https://www.w3.org/ns/credentials/examples/v2"
          ],
          "type": "StudentIdCredential",
          "credentialSubject": {"studentId": ""}
        },
        "acceptedIssuers": [{"id": "did:web:utopia.example.com"}]
      }
    }],
    "challenge": "5e34826e-14da-11f0-98a5-8b1c0a196728",
    "domain": "utopia.example.com"
  }
}
```

---

## Step and template examples

These examples are from the specification, with example hosts and IDs. Some are shortened. The appendix examples also show `sequence` and `zcaps`. The specification says that these minimum examples still depend on the authorization and variable choices of each example.

### A workflow with DID Authentication and credential delivery

This example is from the Create Workflow section, shortened. The first step asks for DID Authentication. The second step issues a credential from a template, with the variables in `sampleAchievementCredential`. The template uses the holder DID from the results of the first step.

```json
{
  "id": "9fd3bc6d-4a04-4b3d-a983-3482d0586626",
  "initialStep": "didAuthRequest",
  "steps": {
    "didAuthRequest": {
      "createChallenge": true,
      "verifiablePresentationRequest": {
        "query": {
          "type": "DIDAuthentication",
          "acceptedMethods": [{"method": "key"}, {"method": "web"}],
          "acceptedCryptosuites": [{"cryptosuite": "eddsa-rdfc-2022"}, {"cryptosuite": "ed25519-2020"}]
        },
        "domain": "https://issuer.example.com"
      },
      "nextStep": "credentialDelivery"
    },
    "credentialDelivery": {
      "issueRequests": [{
        "credentialTemplateId": "caffb919-053a-4bfa-beba-80567904f842",
        "variables": "sampleAchievementCredential"
      }]
    }
  },
  "credentialTemplates": [{
    "id": "caffb919-053a-4bfa-beba-80567904f842",
    "type": "jsonata",
    "template": "{\"credential\": {\"@context\": [\"https://www.w3.org/ns/credentials/v2\", \"https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json\"], \"id\": sampleAchievementCredential.id, \"type\": [\"VerifiableCredential\", \"AchievementCredential\"], \"issuer\": {\"type\": [\"Profile\"], \"name\": \"Example Issuer\"}, \"validFrom\": sampleAchievementCredential.validFrom, \"name\": \"Sample Achievement\", \"credentialSubject\": {\"id\": results.didAuthRequest.verifiablePresentation.holder, \"type\": \"AchievementSubject\", \"name\": sampleAchievementCredential.credentialSubject.name, \"achievement\": {\"id\": sampleAchievementCredential.credentialSubject.achievement.id, \"type\": [\"Achievement\"], \"name\": sampleAchievementCredential.credentialSubject.achievement.name}}}}"
  }],
  "controller": "did:web:issuer.example.com"
}
```

The same workflow can use a step template for the first step. Then the coordinator supplies the variables `verifiablePresentationRequest` and `callbackUrl` when it creates an exchange:

```json
{
  "didAuthRequest": {
    "stepTemplate": {
      "type": "jsonata",
      "template": "{\"createChallenge\": true, \"verifiablePresentationRequest\": verifiablePresentationRequest, \"callback\": {\"url\": callbackUrl}, \"nextStep\": \"credentialDelivery\"}"
    }
  }
}
```

### Minimum step template

One step. The step template takes the whole request from the exchange variable `verifiablePresentationRequest`:

```json
{
  "id": "https://workflows.example.com/workflows/z19nXMUSyXawSMK6j65Vs4jb1",
  "sequence": 0,
  "controller": "did:key:z6MkExampleWorkflowController",
  "steps": {
    "verify": {
      "stepTemplate": {
        "type": "jsonata",
        "template": "{\"verifiablePresentationRequest\": verifiablePresentationRequest}"
      }
    }
  },
  "initialStep": "verify",
  "zcaps": {"...": "..."}
}
```

### Minimum credential template

One step that issues one credential and stores it in the variable `issuedExampleNameCredentialResult`, not in the response:

```json
{
  "id": "https://workflows.example.com/workflows/z19mYrRgRuwN9PnezmhoJhBoV",
  "sequence": 0,
  "controller": "did:key:z6MkExampleWorkflowController",
  "credentialTemplates": [{
    "type": "jsonata",
    "template": "{\"@context\": [\"https://www.w3.org/ns/credentials/v2\", \"https://www.w3.org/ns/credentials/examples/v2\"], \"type\": [\"VerifiableCredential\", \"ExampleNameCredential\"], \"credentialSubject\": {\"name\": name}}"
  }],
  "steps": {
    "issue": {
      "issueRequests": [{
        "credentialTemplateIndex": 0,
        "result": "issuedExampleNameCredentialResult"
      }]
    }
  },
  "initialStep": "issue",
  "zcaps": {"...": "..."}
}
```

### Verification and issuance with a presentation schema

The specification's larger example has two steps. The `verify` step asks for DID Authentication and a `UniversityDegreeCredential` with `createChallenge: true`, and checks the presentation with a `presentationSchema` of type `JsonSchema`. The `issue` step uses one template two times: first with the exchange variables, then with its own `variables` object (`credentialId`, `validFrom` and `results.verify.did`). The workflow has zcaps for `issue`, `createChallenge` and `verifyPresentation`, and an `authorization.oauth2.issuerConfigUrl`, so it supports zcap and OAuth2 authorization.

```json
{
  "issue": {
    "issueRequests": [
      {"credentialTemplateId": "urn:credential-template-1"},
      {
        "credentialTemplateId": "urn:credential-template-1",
        "variables": {
          "credentialId": "urn:different",
          "validFrom": "2024-01-01T00:00:00Z",
          "results": {"verify": {"did": "did:example:1"}}
        }
      }
    ]
  }
}
```

---

## Security and privacy notes

The specification's threat model lists these threats for workflows and exchanges:

- **Guessed exchange URLs.** If exchange URLs have a predictable structure and the workflow ID is known, a script needs to guess only the exchange ID to take over an exchange.
- **Interaction URL origin does not match the coordinator origin.** The user can be confused, and a malicious party can use it for cross-site tracking or session hijacking.
- **Interaction URL does not use HTTPS.** Other schemes need separate encryption, key management and trust models.
- **Interaction URLs leak IP addresses.** Direct connections to interaction URLs expose the user's IP address and location to servers.
- **Interaction URL leads to an attacker-controlled website**, or is **opened by an unexpected application** that registered the same protocol handler.
- **Misconfigured workflow instance.** A flaw in a workflow lets a client skip prerequisites.
- **Workflow variables allow misuse of a template.** Variable options can open workflow paths that were not intended.
- **Exchange state leaked to the coordinator frontend.** Internal processing state reaches frontend responses.
- **DoS through exchange state polling.** Frequent state queries overload the service.
- **Slow callback URLs.** Slow callback endpoints fill worker pools and cause timeouts.
- **Reuse of presentation challenges** to survive unreliable mobile connections lets network sniffers capture presentations and replay them.

The specification recommends a default maximum of 10 MB for each verifiable credential, and larger limits only when necessary.

---

## What the specification leaves to implementations

- The authorization mechanism, other than the forbidden static credentials.
- Whether exchange URLs are capability URLs.
- How the exchange URL reaches the exchange client (CHAPI, QR code, universal link or other).
- How a workflow receives the capabilities for issuer and verifier services.
- Routes to list, update or delete workflows.
- Detailed state transitions, and the rules for `sequence` after creation.
- Default expiry of exchanges, and a maximum number of steps.
- The OID4VCI and OID4VP routes of an exchange.
- Template types other than `jsonata`, and presentation schema types other than `JsonSchema`.
