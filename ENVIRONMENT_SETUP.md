# Environment Variables Setup Guide

## Overview

This guide shows exactly what environment variables to set in Vercel and Render dashboards.

---

## Part 1: MongoDB Atlas Setup

### Prerequisites
1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Get connection string

### Step-by-Step MongoDB Setup

#### 1. Create Cluster
- Dashboard → Create → Free Tier
- Select Region (closest to your server)
- Click "Create"

#### 2. Create Database User
- Dashboard → Security → Database Access
- Click "Add New Database User"
- Username: `quizarena_user` (or any name)
- Password: Generate strong password (30+ characters)
- Database User Privileges: `Atlas admin`
- Click "Add User"
- **Save username and password securely**

#### 3. Allow Network Access
- Dashboard → Security → Network Access
- Click "Add IP Address"
- Select "Allow access from anywhere": `0.0.0.0/0`
- Reason: "Production deployment on Render"
- Click "Confirm"

#### 4. Get Connection String
- Dashboard → Databases → Connect
- Click "Drivers"
- Copy connection string
- Format: `mongodb+srv://username:password@cluster.mongodb.net/quiz-arena?retryWrites=true&w=majority`
- Replace:
  - `username` with your database user
  - `password` with your password
- **Keep this string secure!**

---

## Part 2: Vercel Frontend Variables

### How to Set Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `quiz-arena`
3. Go to **Settings** → **Environment Variables**
4. Add each variable below
5. Select environments: **Production** (and **Preview** for testing)
6. Click "Save"
7. **Redeploy** the project after adding variables

### Variables to Set (Frontend)

#### `VITE_API_URL`
- **Value**: `https://quiz-arena-api.onrender.com/api`
- **Used by**: Client to make API requests
- **Set after**: Backend is deployed on Render
- **Note**: Update this after you get your Render URL

#### `VITE_SOCKET_URL`
- **Value**: `https://quiz-arena-api.onrender.com`
- **Used by**: Client to establish WebSocket connection
- **Set after**: Backend is deployed on Render
- **Note**: Same as API URL but without `/api`

### Initial Deployment (Before Backend Ready)
If you deploy frontend before backend:
1. Leave `VITE_API_URL` and `VITE_SOCKET_URL` **empty**
2. Build will succeed
3. Update these variables once backend URL is known
4. Redeploy frontend to pick up new variables

### Verification
After setting variables:
1. Go to Deployments tab
2. Click "Redeploy" on latest deployment
3. Wait for build to complete
4. Check logs for any errors

---

## Part 3: Render Backend Variables

### How to Set Variables in Render

1. Go to [Render Dashboard](https://render.com/dashboard)
2. Select your service: `quiz-arena-api`
3. Go to **Environment**
4. For each variable, click "Add Environment Variable"
5. Enter Key and Value
6. Click "Save" button at bottom
7. Service will auto-redeploy with new variables

### Variables to Set (Backend)

#### `NODE_ENV`
- **Key**: `NODE_ENV`
- **Value**: `production`
- **Purpose**: Tells app to run in production mode

#### `PORT`
- **Key**: `PORT`
- **Value**: `5000`
- **Purpose**: Port the server runs on
- **Note**: Don't change unless required

#### `JWT_SECRET`
- **Key**: `JWT_SECRET`
- **Value**: Generate strong 32+ character secret
- **How to generate**:
  ```bash
  # On your computer, run:
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Purpose**: Signs authentication tokens
- **Important**: Different from development secret

#### `MONGO_URI`
- **Key**: `MONGO_URI`
- **Value**: `mongodb+srv://username:password@cluster.mongodb.net/quiz-arena?retryWrites=true&w=majority`
- **From**: MongoDB Atlas connection string (Part 1, Step 4)
- **Example**: 
  ```
  mongodb+srv://quizarena_user:MySecurePass123%40@cluster0.aqobddw.mongodb.net/quiz-arena?retryWrites=true&w=majority
  ```
- **Note**: If password has `@`, URL encode it as `%40`

#### `CLIENT_ORIGIN`
- **Key**: `CLIENT_ORIGIN`
- **Value**: Your Vercel frontend URL
- **Example**: `https://quiz-arena.vercel.app`
- **Set after**: Frontend deployed on Vercel
- **Purpose**: CORS configuration - tells backend which frontend is allowed

#### `ENABLE_MONITORING`
- **Key**: `ENABLE_MONITORING`
- **Value**: `false`
- **Purpose**: Disables verbose logging in production
- **Note**: Use `true` for development debugging

#### `DEBUG_API`
- **Key**: `DEBUG_API`
- **Value**: `false`
- **Purpose**: Disables API debug logs
- **Note**: Use `true` to debug issues

#### `DEBUG_MONITORING`
- **Key**: `DEBUG_MONITORING`
- **Value**: `false`
- **Purpose**: Disables system monitoring logs
- **Note**: Use `true` to debug performance issues

### Summary Table

| Variable | Value | Source |
|----------|-------|--------|
| `NODE_ENV` | `production` | Type: production |
| `PORT` | `5000` | Don't change |
| `JWT_SECRET` | `<random-32-chars>` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `MONGO_URI` | `mongodb+srv://user:pass@cluster.../quiz-arena` | MongoDB Atlas → Connect → Drivers |
| `CLIENT_ORIGIN` | `https://your-vercel-domain.vercel.app` | From Vercel deployment |
| `ENABLE_MONITORING` | `false` | Default: false |
| `DEBUG_API` | `false` | Default: false |
| `DEBUG_MONITORING` | `false` | Default: false |

---

## Part 4: MongoDB Password Special Characters

### If Your Password Has Special Characters

MongoDB URIs need URL encoding for special characters:

| Character | Encoded |
|-----------|---------|
| `!` | `%21` |
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |
| `&` | `%26` |

### Example
If password is: `MyPass@123!Secure`
URL encode to: `MyPass%40123%21Secure`

### Full Connection String Example
```
mongodb+srv://quizarena_user:MyPass%40123%21Secure@cluster0.aqobddw.mongodb.net/quiz-arena?retryWrites=true&w=majority
```

---

## Part 5: Testing Variables

### Test Backend Variables (After Render Setup)

#### 1. Test Health Check
```bash
curl https://quiz-arena-api.onrender.com/api/health
# Expected response: {"status":"ok"}
```

#### 2. Check Render Logs
1. Go to Render Dashboard → quiz-arena-api service
2. Click **Logs** tab
3. Look for:
   - "serving on port 5000"
   - No "Error" messages
   - No "MongoDB connection failed"

#### 3. Test MongoDB Connection
Check logs for successful MongoDB connection:
```
[mongoose] connected to database
```

If failed, check:
- `MONGO_URI` is correct
- MongoDB password is URL encoded
- IP whitelist includes `0.0.0.0/0`
- Database user has correct permissions

### Test Frontend Variables (After Vercel Setup)

#### 1. Open Frontend
```
https://your-vercel-domain.vercel.app
```

#### 2. Open Browser DevTools (F12)
- Go to **Console** tab
- Look for errors (red text)
- Common errors:
  - `VITE_API_URL undefined` → Variable not set
  - `CORS error` → Backend doesn't know this domain

#### 3. Check Network Tab
1. Go to **Network** tab
2. Refresh page
3. Look for requests to `/api/health`
   - If successful (200): Good!
   - If CORS error: Update `CLIENT_ORIGIN` on backend
   - If failed: Check backend URL in `VITE_API_URL`

---

## Part 6: Updating Variables

### If You Need to Change Variables

#### On Vercel:
1. Settings → Environment Variables
2. Edit or delete the variable
3. Click "Save"
4. Redeploy: Go to Deployments → Redeploy button
5. Wait 2-3 minutes for redeploy

#### On Render:
1. Environment tab
2. Click variable to edit
3. Change value
4. Click "Save"
5. Service auto-redeploys (wait 1-2 minutes)

---

## Part 7: Common Issues & Solutions

### Issue: "Cannot read property 'VITE_API_URL' of undefined"

**Cause**: Environment variable not set in Vercel

**Solution**:
1. Add `VITE_API_URL` to Vercel Environment Variables
2. Set value to your Render backend URL
3. Redeploy frontend
4. Clear browser cache (Ctrl+F5)

### Issue: CORS error in browser console

**Cause**: Backend doesn't recognize frontend domain

**Solution**:
1. Copy your Vercel domain exactly (including https://)
2. Go to Render → Environment Variables
3. Update `CLIENT_ORIGIN` to match Vercel domain
4. Save (auto-redeploy)
5. Wait 2 minutes and test again

### Issue: "MongoDB connection refused"

**Cause**: Wrong connection string or network access denied

**Solution**:
1. Double-check `MONGO_URI` on Render
2. Verify password is URL encoded
3. Go to MongoDB Atlas → Network Access
4. Confirm IP whitelist includes `0.0.0.0/0`
5. Test connection string locally first

### Issue: Backend 502 error immediately after deploy

**Cause**: Startup error (usually environment variables)

**Solution**:
1. Check Render logs for error message
2. Verify all required variables are set:
   - `MONGO_URI` (exists and is valid)
   - `JWT_SECRET` (minimum 32 characters)
3. Redeploy from Render dashboard

---

## Checklist: Final Variable Setup

### Vercel (Frontend)
- [ ] `VITE_API_URL` set to Render backend URL
- [ ] `VITE_SOCKET_URL` set to Render backend URL
- [ ] Frontend redeployed after setting variables
- [ ] Variables showing in preview deployment

### Render (Backend)
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `5000`
- [ ] `JWT_SECRET` = strong 32+ character secret
- [ ] `MONGO_URI` = valid MongoDB connection string
- [ ] `CLIENT_ORIGIN` = exact Vercel domain
- [ ] `ENABLE_MONITORING` = `false`
- [ ] `DEBUG_API` = `false`
- [ ] Backend redeployed after setting variables
- [ ] No errors in Render logs

### Verification
- [ ] `https://quiz-arena-api.onrender.com/api/health` returns `{"status":"ok"}`
- [ ] Frontend loads without console errors
- [ ] Network requests to backend succeed
- [ ] WebSocket connection established

---

## Quick Reference: URLs & Secrets

**Template** (before deployment)
```
Frontend URL: https://[PROJECT_NAME].vercel.app
Backend URL: https://[SERVICE_NAME].onrender.com

Environment Variables Needed:
VITE_API_URL=https://[SERVICE_NAME].onrender.com/api
VITE_SOCKET_URL=https://[SERVICE_NAME].onrender.com
CLIENT_ORIGIN=https://[PROJECT_NAME].vercel.app
MONGO_URI=mongodb+srv://[USER]:[PASS]@[CLUSTER].mongodb.net/quiz-arena
JWT_SECRET=[RANDOM_32_CHARS]
```

**Save these after deployment**:
- [ ] Frontend URL: ___________________
- [ ] Backend URL: ___________________
- [ ] Vercel project link: ___________________
- [ ] Render service link: ___________________
- [ ] MongoDB cluster link: ___________________
