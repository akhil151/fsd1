# Quiz Arena - Deployment Guide

## Overview
- **Frontend**: React + Vite → **Vercel**
- **Backend**: Express + Node.js + MongoDB → **Render**
- **Database**: MongoDB Atlas (Cloud)

---

## PHASE 1: PRE-DEPLOYMENT PREPARATION

### 1.1 Environment Setup

#### Create `.env.production` file (for local testing):
```env
NODE_ENV=production
PORT=5000
JWT_SECRET=your-strong-secret-key-here-min-32-chars

# MongoDB (use MongoDB Atlas)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/quiz-arena?retryWrites=true&w=majority

# CORS Configuration
CLIENT_ORIGIN=https://your-frontend.vercel.app

# Monitoring
ENABLE_MONITORING=false
DEBUG_API=false
DEBUG_MONITORING=false
```

#### Update `.env.example`:
```env
# Server Configuration
PORT=5000
NODE_ENV=production
JWT_SECRET=your_secret_key_here_min_32_characters

# Database Configuration
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/quiz-arena

# Client Configuration
CLIENT_ORIGIN=https://your-vercel-app.vercel.app

# Monitoring & Debugging
ENABLE_MONITORING=false
DEBUG_API=false
DEBUG_MONITORING=false
```

### 1.2 MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user with a strong password
4. Whitelist IP: `0.0.0.0/0` (Render will need access)
5. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/quiz-arena?retryWrites=true&w=majority`

---

## PHASE 2: CODE UPDATES NEEDED

### 2.1 Fix CORS Configuration (server/routes.ts)

The current CORS only allows localhost. Update to include your Vercel domain:

**Current issue**: Hardcoded localhost only
**Fix**: Use environment variables

### 2.2 Create vercel.json (Frontend Configuration)

Create file: `vercel.json`

### 2.3 Update WebSocket Configuration (server/socket.ts)

Check WebSocket CORS settings for production.

---

## PHASE 3: VERCEL DEPLOYMENT (FRONTEND)

### Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Create Vercel Account & Link Repository

1. Go to [Vercel](https://vercel.com)
2. Sign up with GitHub
3. Click "New Project"
4. Select your Quiz-Arena repository
5. Click "Import"

### Step 3: Configure Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables:

```
VITE_API_URL=https://quiz-arena-api.onrender.com/api
VITE_SOCKET_URL=https://quiz-arena-api.onrender.com
```

**Where to find in code**: `client/src/lib/api.ts`

### Step 4: Configure Build Settings

- **Build Command**: `npm run vercel-build`
- **Output Directory**: `dist/public`
- **Install Command**: `npm install`

### Step 5: Deploy

Click "Deploy" button → Wait for deployment to complete

**Your frontend URL will be**: `https://[your-project-name].vercel.app`

### Step 6: Note Your Vercel Domain

Save the domain, you'll need it for backend CORS configuration.

---

## PHASE 4: RENDER DEPLOYMENT (BACKEND)

### Step 1: Create Render Account

1. Go to [Render](https://render.com)
2. Sign up with GitHub
3. Connect your GitHub account

### Step 2: Deploy Backend Service

1. Click "New +" → "Web Service"
2. Select your Quiz-Arena repository
3. Fill in settings:

   | Field | Value |
   |-------|-------|
   | **Name** | `quiz-arena-api` |
   | **Environment** | `Node` |
   | **Build Command** | `npm install && npm run build` |
   | **Start Command** | `npm start` |
   | **Plan** | Free (or Starter if you need more) |

### Step 3: Configure Environment Variables

In Render Dashboard → Environment:

```
NODE_ENV=production
PORT=5000
JWT_SECRET=[Generate a strong 32+ char secret]
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/quiz-arena?retryWrites=true&w=majority
CLIENT_ORIGIN=https://your-vercel-domain.vercel.app
ENABLE_MONITORING=false
DEBUG_API=false
DEBUG_MONITORING=false
```

### Step 4: Deploy

Click "Create Web Service" → Wait for deployment (5-10 minutes)

**Your backend URL will be**: `https://quiz-arena-api.onrender.com`

### Step 5: Test Backend Health Check

Open in browser: `https://quiz-arena-api.onrender.com/api/health`

Should return: `{"status":"ok"}`

---

## PHASE 5: UPDATE FRONTEND WITH BACKEND URL

### Step 1: Update Vercel Environment Variable

Go back to Vercel Dashboard:
- Settings → Environment Variables
- Update `VITE_API_URL` to your Render backend URL: `https://quiz-arena-api.onrender.com/api`
- Update `VITE_SOCKET_URL` to: `https://quiz-arena-api.onrender.com`

### Step 2: Redeploy Frontend

- Push a small change to trigger redeploy, or
- Go to Vercel Dashboard → Deployments → Latest → Redeploy button

---

## PHASE 6: BACKEND CORS CONFIGURATION UPDATE

Update `server/routes.ts` to include your production domain:

```typescript
const allowedOrigins = [
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://your-vercel-domain.vercel.app", // ADD THIS
];
```

Then redeploy backend on Render.

---

## PHASE 7: VERIFICATION CHECKLIST

- [ ] Backend health check works: `https://quiz-arena-api.onrender.com/api/health`
- [ ] Frontend loads without console errors
- [ ] Can access login page
- [ ] Can test API calls (check Network tab in DevTools)
- [ ] WebSocket connection established (look for `/socket.io` in Network)
- [ ] Authentication works (login, token stored)
- [ ] Quiz creation works (for teacher)
- [ ] Quiz participation works (for student)
- [ ] Real-time updates work (scores, questions)

---

## PHASE 8: MONITORING & TROUBLESHOOTING

### Frontend Issues

**Problem**: CORS errors in console
- **Solution**: Check Render backend has correct `CLIENT_ORIGIN`
- **Verify**: Vercel URL and Backend CLIENT_ORIGIN match

**Problem**: `VITE_API_URL` undefined
- **Solution**: Ensure Vercel env vars are set and redeploy
- **Check**: Vercel Dashboard → Environment Variables

### Backend Issues

**Problem**: Connection refused errors
- **Solution**: Check MongoDB connection string in Render env vars
- **Verify**: MongoDB Atlas has IP whitelist: `0.0.0.0/0`

**Problem**: WebSocket not connecting
- **Solution**: Check `VITE_SOCKET_URL` matches backend URL
- **Verify**: Socket.IO is not being blocked by firewall

**Problem**: 502 Bad Gateway on Render
- **Solution**: Check logs in Render Dashboard
- **Steps**: Go to Render → Service → Logs tab

---

## PHASE 9: PERFORMANCE TUNING

### Render (Free Tier) Considerations:
- App spins down after 15 minutes of inactivity
- First request after idle will be slow (30+ seconds)
- **Solution**: Use Render cron job to keep app awake

### Optional: Add Keep-Alive Service

In Render Dashboard → Environment:
```
# Add monitoring that pings every 10 minutes to prevent spin-down
```

Or use external service like [Kaffeine](https://www.kaffeine.herokuapp.com/)

---

## PHASE 10: PRODUCTION OPTIMIZATION

### Frontend (`vercel.json`):
```json
{
  "buildCommand": "npm run build:client",
  "outputDirectory": "dist/public",
  "env": {
    "VITE_API_URL": "@vite_api_url",
    "VITE_SOCKET_URL": "@vite_socket_url"
  }
}
```

### Backend Performance:
- [ ] Set `ENABLE_MONITORING=false` in production
- [ ] Set `DEBUG_API=false` in production
- [ ] Ensure MongoDB indexes are created
- [ ] Use connection pooling (mongoose default)

---

## QUICK REFERENCE: Commands

```bash
# Local build test
npm run build

# Check for TypeScript errors
npm run check

# Start production build locally
npm start

# Push to GitHub (triggers auto-deploys)
git push origin main

# View logs on Render
# Dashboard → Service → Logs tab

# View logs on Vercel
# Dashboard → Deployments → Latest → View Logs
```

---

## SUPPORT URLS

- **MongoDB Atlas**: https://cloud.mongodb.com
- **Vercel Docs**: https://vercel.com/docs
- **Render Docs**: https://render.com/docs
- **Socket.IO Deployment**: https://socket.io/docs/v4/deployment/

---

## COMMON MISTAKES TO AVOID

1. ❌ Forgetting to set `CLIENT_ORIGIN` on backend
2. ❌ MongoDB Atlas IP whitelist not including `0.0.0.0/0`
3. ❌ Using `localhost` in environment variables
4. ❌ Not updating frontend env vars after backend deployment
5. ❌ Weak JWT secrets (use 32+ characters)
6. ❌ Not testing real-time features (WebSocket)
7. ❌ Not checking CORS headers in Network tab

---

## NEXT STEPS AFTER DEPLOYMENT

1. Set up error monitoring (Sentry, LogRocket)
2. Configure CDN for static assets
3. Set up automated backups for MongoDB
4. Monitor Render resource usage
5. Consider upgrading from free tier for production
6. Set up analytics on frontend
7. Test with real users in different regions
