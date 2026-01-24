# Environment Configuration Setup

Your `.env` file is protected by `.gitignore` (best practice!). Here's how to set it up:

## 📝 Create Your `.env` File

Create a file named `.env` in the `uwazi-backend/` directory with the following contents:

```env
# =====================================================
# Uwazi Backend - Environment Configuration
# =====================================================

# DATABASE CONFIGURATION (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/uwazi_db

# SUPABASE CONFIGURATION
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-role-key

# SERVER CONFIGURATION
PORT=5000
NODE_ENV=development
```

## 🔑 Getting Your Credentials

### Option 1: Supabase Cloud (Recommended)

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Sign up/Log in
   - Create a new project
   - Wait for it to initialize (~2-3 minutes)

2. **Get DATABASE_URL**
   - Navigate to: **Settings → Database → Connection String**
   - Select **Transaction** pooling mode
   - Copy the connection string
   - Replace `[YOUR-PASSWORD]` with your database password
   - Paste as `DATABASE_URL`

3. **Get SUPABASE_URL**
   - Navigate to: **Settings → API → Project URL**
   - Copy and paste as `SUPABASE_URL`

4. **Get SUPABASE_KEY**
   - Navigate to: **Settings → API → Anon public**
   - Copy and paste as `SUPABASE_KEY`

5. **Get SUPABASE_SERVICE_KEY**
   - Navigate to: **Settings → API → Service role**
   - Copy and paste as `SUPABASE_SERVICE_KEY`

### Option 2: Local PostgreSQL

If you prefer local development:

1. **Install PostgreSQL**
   ```bash
   # Windows (using Chocolatey)
   choco install postgresql

   # macOS (using Homebrew)
   brew install postgresql

   # Ubuntu/Linux
   sudo apt-get install postgresql postgresql-contrib
   ```

2. **Create Database**
   ```bash
   createdb uwazi_db
   ```

3. **Set DATABASE_URL**
   ```env
   DATABASE_URL=postgresql://postgres:your_local_password@localhost:5432/uwazi_db
   ```

## 📋 Complete Example `.env`

```env
# =====================================================
# Uwazi Backend - Environment Configuration
# =====================================================

# SUPABASE CLOUD EXAMPLE
DATABASE_URL=postgresql://postgres.abcdefghijk:your-password@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# OR LOCAL POSTGRESQL
# DATABASE_URL=postgresql://postgres:password@localhost:5432/uwazi_db

SUPABASE_URL=https://abcdefghijk.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

PORT=5000
NODE_ENV=development
```

## ✅ Verify Configuration

After creating `.env`:

1. **Test Database Connection**
   ```bash
   npx prisma db push
   ```

2. **Run Migrations**
   ```bash
   npx prisma migrate dev --name init
   ```

3. **Check Schema**
   ```bash
   npx prisma studio  # Opens Prisma Studio to view database
   ```

## 🚀 Next Steps

```bash
# 1. Create .env file with your credentials

# 2. Install dependencies
npm install

# 3. Run migrations
npx prisma migrate dev --name init

# 4. Start server
npm run dev

# 5. Test API (in another terminal)
node test-api.js
```

## ⚠️ Security Notes

- ✅ `.env` is in `.gitignore` - safe to commit your repo
- ✅ Never commit `.env` to version control
- ✅ Use `.env.example` for template
- ✅ Rotate credentials if exposed
- ✅ Use strong passwords
- ✅ Use service role key only on backend

## 🆘 Troubleshooting

### "Cannot connect to database"
- Verify DATABASE_URL is correct
- Check if Supabase project is active
- Ensure PostgreSQL is running (for local setup)

### "Migration failed"
- Clear `.env` and try again
- Check database name and user
- Try: `npx prisma db push --skip-generate`

### "Port already in use"
- Change PORT in `.env` to different value (e.g., 5001)
- Or kill process: `npx lsof -i :5000`

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Prisma PostgreSQL Setup](https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases-typescript-postgres)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

