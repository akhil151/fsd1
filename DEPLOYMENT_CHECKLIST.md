# Deployment Checklist

## Before Deployment

### Code Verification
- [ ] All TypeScript errors fixed: `npm run check`
- [ ] Build completes successfully: `npm run build`
- [ ] No console errors in development: `npm run dev:client`
- [ ] API endpoints working: test with Postman/Insomnia
- [ ] WebSocket connection working in development
- [ ] Git repository is clean: `git status`
- [ ] All changes committed: `git push origin main`

### Environment Variables
- [ ] MongoDB Atlas cluster created
- [ ] MongoDB user created with strong password
- [ ] IP Whitelist includes `0.0.0.0/0`
- [ ] Connection string tested locally
- [ ] JWT_SECRET is minimum 32 characters
- [ ] `.env.example` is updated with all vars

### Local Testing
- [ ] `npm run build` completes without errors
- [ ] `npm start` runs production build locally
- [ ] Frontend loads on `http://localhost:5000`
- [ ] API health check: `GET /api/health` returns `{"status":"ok"}`
- [ ] Authentication flow works (login/logout)
- [ ] Can create quiz (if teacher)
- [ ] Can join quiz (if student)
- [ ] Real-time updates work

---

## Vercel Deployment (Frontend)

### Setup
- [ ] GitHub repository connected to Vercel
- [ ] Build command: `npm run vercel-build`
- [ ] Output directory: `dist/public`
- [ ] Install command: `npm install`

### Environment Variables in Vercel
- [ ] `VITE_API_URL` = (leave empty initially, update after backend deployed)
- [ ] `VITE_SOCKET_URL` = (leave empty initially, update after backend deployed)

### Verification
- [ ] Deployment successful (no build errors)
- [ ] Frontend accessible at Vercel URL
- [ ] Vercel domain copied for CORS configuration
- [ ] Note domain for backup reference

---

## Render Deployment (Backend)

### Setup
- [ ] Service name: `quiz-arena-api`
- [ ] Environment: Node
- [ ] Build command: `npm install && npm run build`
- [ ] Start command: `npm start`
- [ ] Plan: Free tier (can upgrade later)

### Environment Variables in Render
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `5000`
- [ ] `JWT_SECRET` = (32+ character secret, different from dev)
- [ ] `MONGO_URI` = (MongoDB Atlas connection string)
- [ ] `CLIENT_ORIGIN` = (Vercel frontend URL from previous step)
- [ ] `ENABLE_MONITORING` = `false`
- [ ] `DEBUG_API` = `false`
- [ ] `DEBUG_MONITORING` = `false`

### Verification
- [ ] Deployment successful (wait 5-10 minutes)
- [ ] Health check passes: `GET https://quiz-arena-api.onrender.com/api/health`
- [ ] No database connection errors in logs
- [ ] Render backend URL copied

---

## Post-Deployment Integration

### Update Vercel with Backend URL
- [ ] Go to Vercel Dashboard
- [ ] Environment Variables settings
- [ ] Set `VITE_API_URL` = `https://quiz-arena-api.onrender.com/api`
- [ ] Set `VITE_SOCKET_URL` = `https://quiz-arena-api.onrender.com`
- [ ] Redeploy frontend (trigger redeploy or commit change)
- [ ] Wait for new deployment to complete

### Render CORS Configuration
- [ ] Backend has correct `CLIENT_ORIGIN` from Vercel
- [ ] If not, update in Render Environment Variables
- [ ] Redeploy backend
- [ ] Test CORS with browser DevTools

---

## Final Testing

### Cross-Origin Verification
- [ ] No CORS errors in browser console
- [ ] API calls succeed (check Network tab)
- [ ] WebSocket connects (look for `/socket.io`)
- [ ] Authentication works with production tokens

### Feature Testing
- [ ] Homepage loads
- [ ] Login/Signup works
- [ ] Dashboard loads after login
- [ ] Quiz creation works (if teacher)
- [ ] Quiz code displayed correctly
- [ ] Can join quiz with code (if student)
- [ ] Questions load
- [ ] Answer submission works
- [ ] Real-time scoring updates
- [ ] Leaderboard displays correctly
- [ ] WebSocket reconnection works

### Performance Testing
- [ ] Backend responds within 1-2 seconds
- [ ] Frontend loads in under 5 seconds
- [ ] WebSocket latency is acceptable
- [ ] No memory leaks (monitor for 10+ minutes)

---

## Monitoring Setup

### Render Logs
- [ ] Can access logs in Render dashboard
- [ ] No error messages in logs
- [ ] Startup message shows "serving on port 5000"

### Browser DevTools
- [ ] Network tab shows successful requests
- [ ] Console has no errors
- [ ] Application tab shows storage working

---

## Scaling & Optimization

### For Production (After Verified)
- [ ] Upgrade Render from Free tier to Starter/Standard
- [ ] Set up monitoring/alerting
- [ ] Configure MongoDB backup
- [ ] Set up CDN for static assets
- [ ] Enable GZIP compression
- [ ] Minify production builds

### Optional Enhancements
- [ ] Add Sentry for error tracking
- [ ] Add LogRocket for session replay
- [ ] Set up analytics
- [ ] Configure email notifications
- [ ] Set up auto-scaling

---

## Troubleshooting

### If Frontend Shows Blank Page
- [ ] Check browser console for errors
- [ ] Verify `VITE_API_URL` is set in Vercel
- [ ] Check Network tab - is `/api/health` being called?
- [ ] Clear browser cache and reload

### If API Calls Return 404
- [ ] Verify `VITE_API_URL` is correct
- [ ] Check Render backend is running (health check)
- [ ] Look for CORS errors in console
- [ ] Check backend logs on Render

### If WebSocket Won't Connect
- [ ] Verify `VITE_SOCKET_URL` matches backend URL
- [ ] Check Network tab for failed WebSocket connection
- [ ] Ensure backend CORS includes frontend domain
- [ ] Try reconnecting by refreshing page

### If MongoDB Connection Fails
- [ ] Test connection string locally first
- [ ] Verify password doesn't have special chars (if yes, URL encode)
- [ ] Check MongoDB Atlas IP whitelist: `0.0.0.0/0`
- [ ] Verify user has correct permissions
- [ ] Check connection string format in Render env var

---

## Rollback Plan

If deployment fails:
1. Check logs on Render/Vercel
2. Verify environment variables are correct
3. Try redeploying (sometimes temporary)
4. If persistent, roll back to previous commit
5. Fix issue and redeploy

To rollback on Render:
- Go to Service → Deployments → Previous → Redeploy

To rollback on Vercel:
- Go to Deployments → Previous → Redeploy

---

## Success Criteria

Your deployment is successful when:
- ✅ Frontend loads without errors
- ✅ Login/Logout works
- ✅ Quiz operations work end-to-end
- ✅ Real-time features work (WebSocket)
- ✅ No CORS errors
- ✅ No 5xx server errors
- ✅ Performance is acceptable (< 2s response time)
- ✅ Mobile responsive (test on phone)
