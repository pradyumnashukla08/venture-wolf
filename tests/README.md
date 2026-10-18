# Centralized Platform Test Suites

This directory contains categorized test suites for the WaouFund platform.

## Test Categories
- `security/`: Rate limiting, IDOR prevention, token forgery rejection, secret containment.
- `e2e/`: Full end-to-end founder onboarding, AI evaluation, and persistence workflows.
- `unit/`: Domain logic verification (valuation triangulation, readiness math, consistency checker).

## Running Tests
From monorepo root:
```bash
npm test
```
Or within `apps/api`:
```bash
npm test -w apps/api
```
All tests use Node.js's native test runner (`node:test` and `node:assert/strict`) with zero external test-runner dependencies.
