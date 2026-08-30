# SIREEN Pro/Cloud Scope

## Product Principle

Community keeps the essential local security workflow: inspect source, form hypotheses, run supported local verification, review evidence, and export reports. Pro/Cloud is paid for shared operations, managed execution, persistence across users/devices, governance, and support - not for hiding a basic security check.

There is no releasable Pro/Cloud product in the current source tree. Optional Supabase/NOWPayments code is subscription plumbing, not a hosted control plane.

| Paid feature | Why it is paid | Community alternative | Exists now | Development required |
|---|---|---|---|---|
| Hosted SIREEN control plane | Operates APIs, workers, secrets, storage, upgrades, and incident response | Run backend locally | No | HIGH |
| Authentication and identity | Secure ownership of cloud data and billing | No account/local-only use | No | MEDIUM |
| Organizations, teams, RBAC | Shared ownership, access governance, auditability | Local single-user SQLite | No | HIGH |
| Persistent projects and audit history | Managed durable storage, search, retention, backups | Local SQLite export/import | Local-only partial | HIGH |
| Cloud audit workers/background jobs | Queues, isolation, retries, quotas, observability, compute cost | Local foreground/backend execution | No | HIGH |
| Managed Forge/tool environments | Curated versions, cached images, sandbox security, reproducibility | Install Foundry/Docker locally | Experimental local pieces only | HIGH |
| GitHub/CI integration | Hosted credentials, pull-request status, repository lifecycle | Run Community locally in a developer workflow | No | MEDIUM |
| Notifications | Managed email/webhook/Slack delivery and schedules | Export reports and use local tooling | No | MEDIUM |
| Collaboration and finding triage | Comments, assignments, status history, shared evidence | Local reports and SQLite records | No | HIGH |
| Dashboards and organization analytics | Cross-project aggregation and long-term data operation | Local audit list only | No | MEDIUM |
| Advanced reporting | Branded, scheduled, multi-project reports and retention | Community Markdown/JSON evidence report | Partial local report only | MEDIUM |
| Usage limits and metering | Funds hosted compute and model/tool usage | Unlimited user-managed local execution subject to local tools/API keys | Subscription code partial | MEDIUM |
| Billing | Collects payment for managed service | No payment required for Community | Partial machine-ID/NOWPayments plumbing | MEDIUM |
| Priority support/enterprise deployment | Human operational service, SLAs, private networking, deployment support | Community issues/docs | No | MEDIUM to HIGH |

## Existing Subscription Code: Release Position

`backend/subscription/` can create/verify NOWPayments invoices and use Supabase for machine-ID quota records when configured. It has no authenticated user identity, tenant isolation, server-side entitlement model tied to a cloud service, audit log, billing lifecycle, or deployed payment-webhook security posture.

Therefore:

- Do not market it as Pro/Cloud v0.1.
- Do not expose it by default in Community UI.
- Keep it out of the Community critical path.
- Reuse ideas only after cloud identity, tenancy, webhook deployment, secrets management, and entitlement tests exist.

## Minimum Pro/Cloud v0.1

The smallest credible paid release is a **hosted single-organization pilot**, not enterprise software:

- Authenticated users and one organization/workspace model.
- Project records that store repository metadata and submitted audit jobs.
- Durable cloud job queue with isolated worker execution and explicit job/result states.
- Cloud-hosted evidence reports and project audit history.
- Basic member roles: owner, member, viewer.
- A billing boundary: invite-only paid pilot or manually provisioned plan before self-serve billing.
- Usage accounting and a documented retention/deletion policy.

Explicitly defer multi-org enterprise deployment, SSO/SAML, fine-grained RBAC, GitHub App integration, CI annotations, dashboards, analytics, broad notifications, and self-serve subscription billing until after the pilot proves the core job lifecycle.

## Pro/Cloud v0.1 Release Gate

- [ ] Community v0.1 release gate passes on the shared core commit.
- [ ] Authenticated API has no unauthenticated access to another tenant's projects, jobs, reports, or artifacts.
- [ ] Cloud job submission, queueing, execution, cancellation/failure, retry policy, and terminal state are durable and observable.
- [ ] Workers isolate untrusted source and tool execution; secrets never enter job logs/artifacts.
- [ ] Project history and evidence report access are tenant-scoped.
- [ ] Owner/member/viewer authorization is tested.
- [ ] Usage is measured and a manual entitlement boundary works before billing is automated.
- [ ] Production API configuration, webhook validation, backups, retention, and incident logging are reviewed.

## Proposed Paid Architecture

Keep the local engine shared. Do not fork it.

```text
open-source repository
  extension/              VS Code Community UI
  backend/                local API and audit engine
  sdk/ or core/           stable audit/event/report contracts when extracted
  plugins/                future community extension points

private cloud repositories or private packages
  control-plane/          auth, organizations, projects, API gateway
  worker-service/         queue consumers and isolated audit execution
  billing-service/        entitlements, invoices, webhook operations
  integrations/           GitHub, notifications, enterprise connectors
  infrastructure/         production deployment, secrets, monitoring
```

The cloud worker imports a versioned Community audit-engine package or invokes it as a pinned container. The control plane owns identity, tenancy, scheduling, billing, and operational data. This maximizes code sharing while preventing cloud credentials and operational controls from leaking into the public repository.