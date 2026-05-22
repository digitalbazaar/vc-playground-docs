---
title: Verifiable Presentation Requests
---

When working with Verifiable Credentials, Decentralized Identifier (DID) based
Authentication, and Authorization Capabilities, a client application often needs
to request credential-related objects from a wallet or agent.  [Verifiable
Presentation Requests](https://www.w3.org/TR/vcalm/#verifiable-presentation-request) provide a
format for making those requests between parties.

> **Note:** The standalone Verifiable Presentation Request specification has been
> superseded. VPR is now defined in the
> [VCALM (Verifiable Credentials API Lifecycle Management)](https://www.w3.org/TR/vcalm/)
> specification.

## Examples

The [VC Playground](https://vcplayground.org/) uses Verifiable Presentation
Requests (VPRs) sent in CHAPI events or retrieved during a VC API Exchange.

### DID Authentication

```json
{
  "query": [{
    "type": "DIDAuthentication",
    "acceptedMethods": [{"method": "example"}]
  }],
  "challenge": "99612b24-63d9-11ea-b99f-4f66f3e4f81a",
  "domain": "example.com"
}
```
https://www.w3.org/TR/vcalm/#did-authentication

### QueryByExample

```json
{
  "query": [
    {
      "type": "QueryByExample",
      "credentialQuery": [
        {
          // One or more example query entries
          "required": false, // (Optional) Defaults to 'true' if omitted
          // (Optional) Reason for requesting this credential that
          // may be shown to a user by their wallet software
          "reason": "We need you to prove your eligibility to work.",
          "example": {
            "@context": ["https://www.w3.org/2018/credentials/v1", "https://w3id.org/citizenship/v1"],
            "type": "PermanentResidentCard",
            // (Optional) You can request a specific subject id
            "credentialSubject": {
              "id": "...",
              "name": "..."
            },
            // (Optional) Specify only credentials of a particular schema
            "credentialSchema": {
              "id": "urn:foo:1234",
              "type": "SomeType"
            }
          },
          // (Optional) Specify credentials from a particular issuer only
          "trustedIssuer": [
            {
              "required": true,
              "issuer": "urn:some:required:issuer"
            }
          ],
          // (Optional)
          "issuerQuery": [
            //
          ]
        }
      ]
    },
    {
      // Another example query
      "type": "AnotherQueryType"
      // ...
    }
  ],
  "challenge": "3182bdea-63d9-11ea-b6de-3b7c1404d57f",
  // the domain that will be digitally signed in the authentication
  // proof that will be attached to the VerifiablePresentation
  // response, identifying the recipient
  "domain": "jobs.example.com"
}
```
https://www.w3.org/TR/vcalm/#query-by-example