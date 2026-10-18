# WaouFund Core API Reference

All requests must be made over HTTPS. Protected endpoints require the header:
`Authorization: Bearer <Firebase_ID_Token>`

## 1. AI Intelligence Endpoints (`/api/ai/*`)
Rate Limit: 100 req/15m per IP + 60 req/15m per authenticated user.

### `POST /api/ai/chat`
Advisor chat with institutional venture perspective.
* Request: `{ "question": string, "startupContext": object }`
* Response: `{ "success": true, "answer": string }`

### `POST /api/ai/generate-field`
Sparkle Assist for founder profiles (TAM/SAM/SOM, Elevator Pitch, Moats).
* Request: `{ "fieldLabel": string, "context": object, "instruction"?: string }`
* Response: `{ "success": true, "result": string }`

### `POST /api/ai/extract-documents`
Server-side synthesis of diligence materials (1–20 files metadata).
* Request: `{ "files": Array<{ "name": string, "size": number, "type": string }> }`
* Response: `{ "success": true, "data": ExtractedStartupData }`

### `POST /api/ai/evaluate-grill`
Interrogation feedback and vector scoring from verbatim answers.
* Request: `{ "qaPairs": Array<{ "question": string, "answer": string }>, "startupContext"?: object }`
* Response: `{ "success": true, "verdict": ClarityVerdict }`

### `POST /api/ai/evaluate-deck`
Pitch deck diagnostic and action plan generator.
* Request: `{ "fileName": string, "fileSize": string, "stage": string }`
* Response: `{ "success": true, "result": DeckDiagnosticResult }`

---

## 2. Startup Profile Endpoints (`/api/startup/*`)

### `GET /api/startup/profile`
Retrieves the authenticated founder's startup profile from Firestore.
* Response: `{ "success": true, "profile": StartupProfile | null }`

### `PUT /api/startup/profile`
Upserts the authenticated founder's startup profile.
* Request: `StartupProfileSchema` (validated by Zod)
* Response: `{ "success": true, "profile": StartupProfile }`

### `DELETE /api/startup/profile`
Deletes the authenticated founder's profile document.
* Response: `{ "success": true, "message": "Startup profile deleted successfully" }`
