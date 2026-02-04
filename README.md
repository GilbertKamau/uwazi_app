# Uwazi Backend - Social Justice Tracking Application

## Project Structure

```
uwazi-backend/
├── prisma/
│   └── schema.prisma      -- Prisma database schema (PostgreSQL)
├── src/
│   ├── controllers/       -- Business logic handlers
│   │   ├── reportController.js
│   │   ├── userController.js
│   │   └── commentController.js
│   └── routes/            -- API endpoint definitions
│       ├── reportRoutes.js
│       ├── userRoutes.js
│       └── commentRoutes.js
├── app.js                 -- Express server entry point
├── package.json           -- Dependencies and scripts
├── .env                   -- Environment variables
├── .gitignore             -- Git ignore rules
└── README.md              -- This file
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Update `.env` with your Supabase credentials:
```
DATABASE_URL=postgresql://user:password@host:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-key
PORT=5000
NODE_ENV=development
```

### 3. Set up the Database
```bash
npx prisma migrate dev --name init
```

### 4. Start the Server
**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server will run on `http://localhost:5000`

## Database Models

### User
- id (unique)
- email (unique)
- name
- role (admin, reviewer, viewer)
- createdAt, updatedAt

### Report
- id (unique)
- title
- description
- category
- status (pending, reviewing, resolved, closed)
- priority (low, medium, high, critical)
- figmaLink
- figmaFields (JSON - flexible Figma data)
- location
- date
- authorId (foreign key to User)
- createdAt, updatedAt

### Comment
- id (unique)
- content
- reportId (foreign key to Report)
- authorId (foreign key to User)
- createdAt, updatedAt

### Tag
- id (unique)
- name (unique)
- description

## API Endpoints (To be implemented)

### Reports
- `POST /api/reports` - Create a new report
- `GET /api/reports` - Get all reports
- `GET /api/reports/:id` - Get a report by ID
- `PUT /api/reports/:id` - Update a report
- `DELETE /api/reports/:id` - Delete a report
- `PATCH /api/reports/:id/status` - Update report status

### Users
- `POST /api/users` - Create a new user
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get a user by ID
- `PUT /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user
- `PATCH /api/users/:id/role` - Update user role

### Comments
- `POST /api/comments` - Create a comment
- `GET /api/comments/report/:reportId` - Get comments for a report
- `GET /api/comments/:id` - Get a comment by ID
- `PUT /api/comments/:id` - Update a comment
- `DELETE /api/comments/:id` - Delete a comment

## Health Check
- `GET /health` - Server status

## Next Steps
1. Uncomment the route imports in `app.js`
2. Implement controller logic in each controller file
3. Uncomment the route handlers in each routes file
4. Test API endpoints


 # Member 3 — Data & Integrity Signals Lead
 
 This README outlines exactly what you need to do for your area. Keep it simple, evidence-based, and focused on patterns rather than individuals.
 
 ## Responsibilities
 
 ### Integrity signal system
 You will design and implement the integrity signal system. This includes:
 - Defining signal types
 - Submission logic
 - Aggregation rules
 - "Is This Normal?" checker logic
 
 ### Data modeling (JSON / Firestore)
 You will define the data structure so signals can be stored, validated, and aggregated.
 
 ## Deliverables
 
 ### 1) Signal form
 Build a clear form for users to submit signals.
 - Inputs for each signal type
 - Timestamp and optional context fields
 - Basic client-side validation
 
 ### 2) Validation logic
 Validate incoming signals before storage.
 - Required fields present
 - Signal types are allowed
 - Values are within acceptable ranges
 - Optional fields are normalized
 
 ### 3) Aggregated stats (counts, trends)
 Provide summary-level views of signals.
 - Total counts by type and time window
 - Trend indicators (up/down/steady)
 - No individual-level reporting
 
 ### 4) Basic charts
 Add simple charts to show patterns over time.
 - Bar/line charts for counts by day or week
 - Stacked view for signal categories
 - Clear labels and legends
 
 ### 5) What you explain to judges
 Use this exact framing:
 - "We avoided accusations by aggregating signals and showing patterns instead of individuals."
 - "Signals are stored with strict validation and only used for group-level insights."
 
 ## Integrity Signal System Details
 
 ### Signal types
 Define the list of allowed signal types. Examples:
 - Suspicious timing pattern
 - Repeated unusual submissions
 - Sudden score spikes
 - Multiple submissions from same device
 
 Keep the list short and meaningful. Each type should have a name and short description.
 
 ### Submission logic
 The rules for when a signal can be submitted:
 - Must include a valid signal type
 - Must include a timestamp
 - Must pass validation checks
 - Optionally include a short note
 
 ### Aggregation rules
 Only aggregate on groups, never on individuals.
 - Aggregate by time window (day/week)
 - Aggregate by signal type
 - Provide trend deltas
 
 ### "Is This Normal?" checker logic
 Provide a simple check to compare new counts against historical baselines.
 - Use a rolling average or median baseline
 - Flag if count exceeds threshold (example: 2x baseline)
 - Output: "Normal" or "Needs Review"
 
 ## Data Modeling (JSON / Firestore)
 
 ### Signal record (JSON example)
 {
   "signalId": "auto-generated",
   "type": "repeated_unusual_submissions",
   "timestamp": "2026-01-24T20:10:00Z",
   "context": {
     "eventId": "optional",
     "note": "optional short description"
   },
   "source": "form",
   "version": 1
 }
 
 ### Aggregated stats (JSON example)
 {
   "window": "2026-01-24",
   "type": "repeated_unusual_submissions",
   "count": 14,
   "baseline": 6,
   "trend": "up",
   "status": "Needs Review"
 }
 
 ## Cursor Usage Expectations
 
 ### Logic explanations
 Write short notes explaining:
 - Why a validation rule exists
 - Why an aggregation rule is safe
 
 ### Conditional flows
 Describe any logic that branches:
 - Valid vs invalid submissions
 - Normal vs Needs Review checks
 
 ### Data structure refinement
 Keep structures consistent:
 - Use stable field names
 - Keep optional fields in a `context` object
 - Version your records

## Python Implementation (Structure)

File layout and purpose:
- `app.py` CLI entry point for submit, aggregate, and charts.
- `ny.py` Alias to run `app.py` main.
- `signals/__init__.py` Package exports.
- `signals/types.py` Allowed signal types and descriptions.
- `signals/models.py` Data classes for signal records and aggregates.
- `signals/utils.py` ISO-8601 helpers and string normalization.
- `signals/validation.py` Validation and normalization logic.
- `signals/normality.py` "Is This Normal?" checker.
- `signals/aggregation.py` Group-only aggregation and trends.
- `signals/storage.py` JSON storage helpers.
- `signals/charts.py` Basic charts with matplotlib or ASCII fallback.
- `signals/form.py` Interactive signal form.

Run examples:
- `python app.py submit --interactive`
- `python app.py aggregate --window day`
- `python app.py charts --window week`

Notes:
- Signals are stored in `data/signals.json` as a list of JSON records.
- Charts are written to `output/`.

## Logic Notes

Why a validation rule exists:
- Timestamp bounds prevent stale or future-dated records from skewing trends.
- Type allowlist ensures only defined categories enter aggregation.
- Context length caps keep optional fields safe and consistent.

Why an aggregation rule is safe:
- Aggregation only groups by window and type, never by individual IDs.
- Baselines and trends are computed from windowed counts only.

## Conditional Flows

Valid vs invalid submissions:
- Valid signals are normalized and stored.
- Invalid signals return a clear error message and are not stored.

Normal vs Needs Review checks:
- If count exceeds the baseline threshold, status is "Needs Review".
- Otherwise the status remains "Normal".

## Frontend Integration (HTTP Endpoints)

This project can be used by a frontend via these endpoints (served by `api.py`):

- `GET /health` -> server health
- `GET /signal-types` -> list allowed signal types
- `POST /signals` -> submit a new signal (validated + stored)
- `GET /stats?window=day|week` -> group-only aggregated stats (safe for judges)

Run the API server:
- **No-install option (recommended here)**: `python simple_api.py`
- Optional FastAPI option (needs internet/PyPI access):
  - Install deps: `python -m pip install -r requirements.txt`
  - Start server: `python -m uvicorn api:app --reload --port 8000`

Example `POST /signals` body:
```json
{
  "type": "repeated_unusual_submissions",
  "timestamp": "2026-01-24T20:10:00Z",
  "context": { "eventId": "optional", "note": "optional short description" }
}
```
 

