# Skipped Items

This file tracks intentional skips so they do not become invisible debt.

## AI Analysis

- Background AI job queue
  - Skipped because the current endpoint returns analysis synchronously and now caps provider attempts.
  - Add when analysis must continue after client or gateway timeout, or when more than two model attempts are required.

- Persistent model health tracking
  - Skipped because process-local round-robin is enough for the current single-service setup.
  - Add when running multiple API instances or when provider/model failures need cooldowns across processes.

- Project-specific AI context prompts
  - Skipped because there is no project settings engine yet for architecture notes.
  - Add when users need stack-aware recommendations like framework, database, hosting, or runtime details.

- Code diff summaries in AI facts
  - Skipped because GitHub/repository integration is not implemented yet.
  - Add when CI sends commit metadata and Regressor99 can safely fetch or receive changed-file summaries.

## CI/CD

- Full pipeline provider integrations
  - Skipped because the current CI/CD API key flow is provider-agnostic and can already be called from GitHub Actions, GitLab, or other CI tools.
  - Add provider-specific setup helpers when repeated manual setup becomes painful.

## Benchmark Execution

- External worker queue
  - Skipped because runs currently execute through the API process for the working model.
  - Add when benchmark runs become long-running, concurrent, or must survive API restarts.

- k6 adapter
  - Skipped because the internal HTTP runner is enough for the current core engine validation.
  - Add when scripts need richer load profiles, browser-style scenarios, or k6-compatible user workflows.

## Security

- Rate limiting
  - Skipped because authentication now protects non-public API routes, but abuse throttling is still separate.
  - Add before public deployment or when API keys/users can create expensive workloads.

- IP allowlists for API keys
  - Skipped because API key scopes and project scoping are implemented first.
  - Add when enterprise users need CI requests restricted to known network ranges.

## Frontend

- Full production UI for all engines
  - Skipped because the current focus is backend core engine correctness.
  - Add after the backend API stabilizes enough that UI work will not churn.

