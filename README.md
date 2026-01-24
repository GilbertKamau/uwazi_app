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

