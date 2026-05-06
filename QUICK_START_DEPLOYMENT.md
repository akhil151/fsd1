# Quick Start: Deploy to Vercel & Render

## ⏱️ Estimated Time: 30 minutes (first time)

---

## STEP 1: Prepare MongoDB (5 min)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Create database user: Save **username** and **password**
4. Network Access → Allow `0.0.0.0/0`
5. Cluster → Connect → Copy connection string
   - Example: `mongodb+srv://user:password@cluster.mongodb.net/quiz-arena?retryWrites=true&w=majority`

**Save this connection string - you'll need it soon!**

---

## STEP 2: Deploy Frontend to Vercel (5 min)

### 2.1 Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2.2 Deploy on Vercel
1. Go to https://vercel.com
2. Sign up with GitHub
3. Import your Quiz-Arena repository
4. Click **Deploy** (it will build and deploy)

**Copy your Vercel URL** - it looks like: `https://quiz-arena.vercel.app`

---

## STEP 3: Deploy Backend to Render (5 min)

### 3.1 Create Service
1. Go to https://render.com
2. Sign up with GitHub
3. New → Web Service
4. Select Quiz-Arena repository
5. Fill in:
   - **Name**: `quiz-arena-api`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

### 3.2 Add Environment Variables

Before clicking "Create", add these variables:

```
NODE_ENV = production
PORT = 5000
JWT_SECRET = [Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]
MONGO_URI = [Your MongoDB connection string from Step 1]
CLIENT_ORIGIN = https://[YOUR-VERCEL-URL].vercel.app
ENABLE_MONITORING = false
DEBUG_API = false
DEBUG_MONITORING = false
```

### 3.3 Deploy
Click **Create Web Service** and wait 5-10 minutes

**Copy your Render URL** - it looks like: `https://quiz-arena-api.onrender.com`

---

## STEP 4: Update Frontend with Backend URL (3 min)

### 4.1 Add Vercel Environment Variables
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add these variables:

```
VITE_API_URL = https://quiz-arena-api.onrender.com/api
VITE_SOCKET_URL = https://quiz-arena-api.onrender.com
```

### 4.2 Redeploy Frontend
1. Go to Deployments tab
2. Click **Redeploy** on latest deployment
3. Wait for build to complete

---

## STEP 5: Test Everything (5 min)

### 5.1 Test Backend
Open in browser:
```
https://quiz-arena-api.onrender.com/api/health
```
Should show: `{"status":"ok"}`

### 5.2 Test Frontend
1. Go to your Vercel URL
2. Open DevTools (F12) → Console
3. Should see **NO red errors**
4. Test features:
   - Login
   - Create/Join quiz
   - Real-time updates

### 5.3 Check WebSocket
1. DevTools → Network tab
2. Refresh page
3. Look for `/socket.io` connections
4. Should be **successful** (not red)

---

## STEP 6: Fix Any Issues (5-10 min)

### Problem: Frontend shows blank page
- [ ] Clear cache: Ctrl+Shift+Del (Windows) or Cmd+Shift+Del (Mac)
- [ ] Check console errors (F12)
- [ ] Verify `VITE_API_URL` in Vercel env vars

### Problem: CORS errors
- [ ] Check Vercel URL in `CLIENT_ORIGIN` on Render
- [ ] Make sure URL includes `https://` prefix
- [ ] Redeploy backend after changing

### Problem: Backend returns 502
- [ ] Check Render logs: Logs tab
- [ ] Verify MongoDB connection string is correct
- [ ] Ensure `JWT_SECRET` is at least 32 characters

### Problem: WebSocket won't connect
- [ ] Verify `VITE_SOCKET_URL` in Vercel
- [ ] Check Network tab for `/socket.io` connection
- [ ] Verify backend is responding to health check

---

## ✅ SUCCESS CHECKLIST

- [ ] Backend health check works
- [ ] Frontend loads without errors
- [ ] Can log in
- [ ] Can create/join quiz
- [ ] Real-time features work (scores update)
- [ ] WebSocket connection in Network tab

---

## 📝 IMPORTANT: Save These URLs

**Frontend**: https://[your-project].vercel.app
**Backend**: https://quiz-arena-api.onrender.com

**Dashboard Links**:
- Vercel: https://vercel.com/dashboard
- Render: https://dashboard.render.com
- MongoDB: https://cloud.mongodb.com

---

## 🔧 Common Commands

### If you need to redeploy:

**Frontend (Vercel)**:
- Push to GitHub: `git push origin main` (auto-deploys)
- Or manual: Vercel Dashboard → Redeploy button

**Backend (Render)**:
- Render Dashboard → Manual Deploy button
- Or push to GitHub (if connected)

### Update environment variables:

**On Vercel**: Settings → Environment Variables → Save → Redeploy
**On Render**: Environment tab → Edit → Save (auto-redeploy)

---

## 🚀 You're Live!

Your app is now deployed! 

**Share your frontend URL with users:**
```
https://your-domain.vercel.app
```

**Monitor your app**:
- Vercel Logs: Deployments → Click deployment → View Logs
- Render Logs: Service → Logs tab

---

## 📞 Next Steps (Optional)

- [ ] Add error monitoring (Sentry)
- [ ] Set up email notifications
- [ ] Configure analytics
- [ ] Monitor database usage
- [ ] Upgrade from free tier for production

---

## 💡 Tips

- **Free tier sleeps**: Render free tier spins down after 15 minutes. First request after idle takes 30+ seconds. Upgrade to Starter ($7/month) if needed.
- **CORS issues?**: Most common is forgetting `CLIENT_ORIGIN` on backend or mismatched URLs (with/without https://)
- **Database full?**: MongoDB free tier has 512MB limit. Check usage in Atlas dashboard.
- **Need to change variables?** Update on Vercel/Render dashboard → redeploy

---

## Detailed Guides

For more detailed information, see:
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Full detailed steps
- [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) - Environment variables explained
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Complete verification checklist
