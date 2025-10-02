# Getting Your Supabase Auth Information

## 📋 What You Need

To test the VaR calculation API, you need:
1. **User ID** - Your Supabase auth user ID
2. **JWT Token** - Your authentication token

---

## 🔑 Option 1: Get from Supabase Dashboard

### Get User ID:
1. Go to https://supabase.com/dashboard/project/qlyqxlzlxdqboxpxpdjp
2. Click **Authentication** in the left sidebar
3. Click **Users**
4. Find your user account
5. Click on it to see details
6. Copy the **User UID** (looks like `1234abcd-5678-efgh-9012-ijklmnopqrst`)

### Get JWT Token (Temporary):
1. In the Supabase dashboard, click **SQL Editor**
2. Run this query:
   ```sql
   SELECT auth.sign_jwt(
     json_build_object(
       'sub', 'YOUR-USER-ID-HERE',
       'role', 'authenticated',
       'iat', extract(epoch from now())::integer,
       'exp', extract(epoch from now() + interval '1 hour')::integer
     ),
     'YOUR-JWT-SECRET-HERE'
   );
   ```
   Replace:
   - `YOUR-USER-ID-HERE` with your User ID from above
   - `YOUR-JWT-SECRET-HERE` with: `hroFKe1jQvP2tniUe+/EZckNGxS8nta1x+BfkY9jOtqER90dMMqEteJZv7Ve7Ka5aG8Padj8+qrKNxktWCfWUA==`

3. Copy the generated token

---

## 🔑 Option 2: Get from Your React Native App

If your app is already running with Supabase auth:

```typescript
import { supabase } from './supabaseClient';

// Get current user
const { data: { user } } = await supabase.auth.getUser();
console.log('User ID:', user?.id);

// Get JWT token
const { data: { session } } = await supabase.auth.getSession();
console.log('JWT Token:', session?.access_token);
```

---

## 🔑 Option 3: Create a Test User via API

```bash
curl -X POST 'https://qlyqxlzlxdqboxpxpdjp.supabase.co/auth/v1/signup' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMTkwNzMsImV4cCI6MjA2NTY5NTA3M30.lHXOj3_co_4GPLqPyFKr64jfz3V7qPYc6St7-SiNbaM" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!"
  }'
```

This will return a response with `access_token` (your JWT) and `user.id` (your User ID).

---

## ✅ Once You Have Both:

Run the setup and test scripts:

```bash
# 1. Make scripts executable
chmod +x setup-test-portfolio.sh test-var-calculation.sh

# 2. Create test portfolio
./setup-test-portfolio.sh

# 3. Test VaR calculation
./test-var-calculation.sh
```

---

## 🚨 Important Notes

- JWT tokens from Option 1 (SQL query) expire in 1 hour
- Tokens from your app expire based on your Supabase settings (usually 1 hour)
- For production, always get tokens from your app's auth flow
- Never commit JWT tokens or secrets to Git

