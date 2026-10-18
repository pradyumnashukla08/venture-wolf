# WaouFund Platform Architecture Specification

## 1. Executive Architecture Summary
WaouFund is architected as an institutional-grade, multi-platform venture intelligence platform built on a **Modular Monolith** pattern. It unifies client interfaces across web (`apps/web`) and mobile (`apps/mobile`) through a hardened, single-deployment Express 5 gateway (`apps/api`) hosted on Firebase Cloud Functions 2nd Generation.

## 2. Directory Structure
```text
waoufund-platform/
├── apps/
│   ├── web/                     # React 19 + TypeScript + Vite SPA
│   ├── mobile/                  # React Native / Expo Mobile App
│   └── api/                     # Express 5 API on Cloud Functions 2nd Gen
│       └── src/modules/
│           ├── identity/        # Auth verification & session lifecycle
│           ├── founder/         # Startup profile & metrics CRUD
│           ├── ai/              # Gemini Flash 3.5 engine & provenance guards
│           ├── funding/         # Readiness calculation & valuation triangulation
│           └── document/        # Document metadata & extraction
├── packages/
│   ├── shared/                  # Shared domain types & Firestore interfaces
│   └── validation/              # Centralized Zod schemas for all requests
├── infrastructure/
│   └── firebase/                # Firebase Hosting, Functions, and Security Rules
├── tests/                       # Centralized regression, security, and E2E suites
└── docs/                        # Architecture, API specs, security, and runbooks
```

## 3. Core Architectural Boundaries
1. **Identity & Authentication:** Handled exclusively via Firebase Authentication. All API endpoints verify cryptographic JWTs and inject `req.userId`. Client-supplied IDs are strictly overridden.
2. **Founder Data Persistence:** Authoritative state is stored in Firestore at `startups/{userId}`. Client browser storage (`localStorage` / `sessionStorage`) is strictly restricted from storing sensitive startup metrics or credentials.
3. **AI Pipeline:** Powered by Google Gemini 3.5 Flash server-side. Zero synthetic fallbacks are permitted; failures produce clean user-facing error messages without exposing upstream secrets or internal stack traces.
4. **Rate Limiting:** Defense-in-depth with an edge IP limiter (100 req / 15m) and a token-verified per-user limiter (60 req / 15m).
