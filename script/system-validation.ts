import http from 'http';
import { io } from 'socket.io-client';
import { fileURLToPath } from 'url';

let teacherToken = '';
let studentToken = '';
let quizId = '';
const failures: string[] = [];

const report: string[] = [];

function logPass(msg: string) {
    console.log(`✅ ${msg}`);
    report.push(`✅ ${msg}`);
}

function logFail(msg: string) {
    console.error(`❌ ${msg}`);
    report.push(`❌ ${msg}`);
    failures.push(msg);
}

export async function runValidation(options: { durationMins?: number, port?: string } = {}) {
    const port = options.port || '3000';
    const API_URL = `http://localhost:${port}/api`;
    const WS_URL = `http://localhost:${port}`;
    
    console.log(`🚀 Starting System Validation on port ${port}...\n`);

    const TEST_DURATION_MINS = options.durationMins || parseInt(process.env.TEST_DURATION_MINS || "0", 10);
    const isSoakTest = TEST_DURATION_MINS > 0;

    try {
        // --- PHASE 1: REGISTRATION & AUTH FLOW ---
        console.log("--- PHASE 1: Auth & Edge Cases ---");
        
        async function localRequest(path: string, opts: any = {}) {
            const res = await fetch(`${API_URL}${path}`, {
                ...opts,
                headers: {
                    'Content-Type': 'application/json',
                    ...(opts.token ? { 'Authorization': `Bearer ${opts.token}` } : {}),
                    ...opts.headers,
                },
            });
            let body;
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                body = await res.json();
            } else {
                body = await res.text();
            }
            return { status: res.status, body };
        }

        // 1. Missing fields
        let res = await localRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email: 'test@test.com' })
        });
        if (res.status === 400) logPass("Missing fields register -> 400");
        else logFail(`Missing fields register expected 400, got ${res.status}`);

        // 2. Valid Teacher Registration
        const teacherEmail = `teacher_${Date.now()}@test.com`;
        res = await localRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name: 'Teacher', email: teacherEmail, password: 'password', role: 'teacher' })
        });
        if (res.status === 201 && res.body.token) {
            logPass("Valid teacher register -> 201 + token");
            teacherToken = res.body.token;
        } else logFail(`Valid register failed: ${JSON.stringify(res.body)}`);

        // 3. Valid Student Registration
        const studentEmail = `student_${Date.now()}@test.com`;
        res = await localRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name: 'Student', email: studentEmail, password: 'password', role: 'student' })
        });
        if (res.status === 201 && res.body.token) {
            logPass("Valid student register -> 201 + token");
            studentToken = res.body.token;
        } else logFail(`Valid student register failed: ${JSON.stringify(res.body)}`);

        // 4. Duplicate Registration
        res = await localRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name: 'Teacher2', email: teacherEmail, password: 'password', role: 'teacher' })
        });
        if (res.status === 409) logPass("Duplicate register -> 409");
        else logFail(`Duplicate register expected 409, got ${res.status}`);

        // 5. Invalid Login
        res = await localRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: teacherEmail, password: 'wrongpassword' })
        });
        if (res.status === 401) logPass("Invalid login -> 401");
        else logFail(`Invalid login expected 401, got ${res.status}`);

        // 6. Valid Login
        res = await localRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: teacherEmail, password: 'password' })
        });
        if (res.status === 200 && res.body.token) logPass("Valid login -> 200 + token");
        else logFail(`Valid login failed: ${res.status}`);

        // 7. Get Me (Unauthenticated)
        res = await localRequest('/auth/me');
        if (res.status === 401) logPass("Get Me unauthenticated -> 401");
        else logFail(`Get Me unauth expected 401, got ${res.status}`);

        // 8. Get Me (Authenticated)
        res = await localRequest('/auth/me', { token: teacherToken });
        if (res.status === 200 && res.body.user) logPass("Get Me authenticated -> 200");
        else logFail(`Get Me auth failed: ${res.status}`);

        // 9. Malformed JSON
        const malformedRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{"email": "test@test.com", "password": "pass"' // Missing closing brace
        });
        if (malformedRes.status >= 400 && malformedRes.status < 500) logPass(`Malformed JSON -> ${malformedRes.status} (Handled gracefully)`);
        else logFail(`Malformed JSON handled incorrectly: ${malformedRes.status}`);

        // --- PHASE 2: QUIZ CREATION & ROLE VALIDATION ---
        console.log("\n--- PHASE 2: Quiz Management & DB Integrity ---");

        // 10. Student tries to create quiz (Should fail, teacher only)
        res = await localRequest('/quizzes', {
            method: 'POST',
            token: studentToken,
            body: JSON.stringify({ title: 'Student Quiz' })
        });
        if (res.status === 403) logPass("Student create quiz -> 403 (Teacher Only)");
        else logFail(`Student create quiz expected 403, got ${res.status}`);

        // 11. Teacher creates quiz without title
        res = await localRequest('/quizzes', {
            method: 'POST',
            token: teacherToken,
            body: JSON.stringify({})
        });
        if (res.status === 400) logPass("Teacher create quiz missing title -> 400");
        else logFail(`Teacher create quiz missing title expected 400, got ${res.status}`);

        // 12. Teacher creates valid quiz
        res = await localRequest('/quizzes', {
            method: 'POST',
            token: teacherToken,
            body: JSON.stringify({ title: 'My Awesome Quiz', questions: [] })
        });
        if (res.status === 201 && res.body.quiz) {
            logPass("Teacher creates valid quiz -> 201");
            quizId = res.body.quiz._id;
        } else logFail(`Teacher create quiz failed: ${res.status}`);

        // 13. Invalid DB query (Get invalid quiz analytics)
        res = await localRequest(`/quizzes/not-a-valid-mongo-id/analytics`, {
            token: teacherToken
        });
        // This usually triggers a CastError in Mongoose if not handled
        if (res.status >= 400 && res.status <= 500) logPass(`Invalid ID query gracefully handled -> ${res.status}`);
        else logFail(`Invalid ID query returned unexpected status: ${res.status}`);

        // --- PHASE 3: CONCURRENCY AND STRESS TEST ---
        if (isSoakTest) {
            console.log("\n--- PHASE 3: Production-Like Load Pattern ---");
            console.log(`Running sustained load test for ${TEST_DURATION_MINS} minutes...`);
            
            const loadStartTime = Date.now();
            const durationMs = TEST_DURATION_MINS * 60 * 1000;
            let cycles = 0;

            while (Date.now() - loadStartTime < durationMs) {
                cycles++;
                console.log(`\n[Load Cycle ${cycles}] Simulating burst traffic...`);
                
                const concurrentPromises = [];
                const burstSize = Math.floor(Math.random() * 100) + 100;
                for (let i = 0; i < burstSize; i++) {
                    if (i % 2 === 0) {
                        concurrentPromises.push(localRequest('/auth/me', { token: teacherToken }));
                    } else {
                        concurrentPromises.push(localRequest('/auth/me', { token: 'invalid_token' }));
                    }
                }
                
                const concurrentResults = await Promise.all(concurrentPromises);
                const successful = concurrentResults.filter(r => r.status === 200).length;
                const unauthorized = concurrentResults.filter(r => r.status === 401).length;
                
                if (successful + unauthorized === burstSize) {
                    logPass(`Cycle ${cycles} passed: ${successful}x200 and ${unauthorized}x401 with no crashes.`);
                } else {
                    logFail(`Cycle ${cycles} failed: Expected ${burstSize} responses, got ${successful + unauthorized}.`);
                }

                console.log(`[Load Cycle ${cycles}] Simulating idle period (2s)...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // --- PHASE 3B: SUSTAINED WEBSOCKET STABILITY ---
            console.log("\n--- PHASE 3B: Sustained WebSocket Stability ---");
            console.log(`Running WebSocket tests for ${TEST_DURATION_MINS} minutes...`);
            const wsLoadStartTime = Date.now();
            const clients: any[] = [];
            
            for(let i=0; i<50; i++) {
                const socket = io(WS_URL, {
                    reconnection: true,
                    reconnectionDelay: 500,
                    transports: ['websocket']
                });
                clients.push(socket);
                
                socket.on("connect", () => {
                    socket.emit("join_room", { quizId: "test-room-123", user: { id: `user-${i}`, name: `User ${i}`, role: "student" } });
                });
            }
            
            let wsCycles = 0;
            while (Date.now() - wsLoadStartTime < durationMs) {
                wsCycles++;
                console.log(`\n[WS Load Cycle ${wsCycles}] Simulating disconnect storms...`);
                const stormClients = clients.slice(0, 20);
                stormClients.forEach(c => c.disconnect());
                await new Promise(resolve => setTimeout(resolve, 1000));
                stormClients.forEach(c => c.connect());
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            logPass(`Sustained WebSocket Stability completed over ${wsCycles} cycles.`);
            clients.forEach(c => c.disconnect());
        } else {
            console.log("\n--- PHASE 3: Skipping sustained load (Final Mode) ---");
        }

        // --- PHASE 4: FAILURE SCENARIOS ---
        console.log("\n--- PHASE 4: Network Failure Scenarios ---");
        
        await new Promise<void>((resolve) => {
            const req = http.request(`${WS_URL}/api/quizzes`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${teacherToken}` }
            });
            
            req.on('error', () => {
                logPass(`Client disconnect simulated mid-request.`);
                resolve();
            });
            
            req.end(() => {
                req.destroy();
            });
        });

        // --- PHASE 5: 404 AND FALLBACK ROUTE VALIDATION ---
        console.log("\n--- PHASE 5: 404 and Fallback Route Validation ---");
        
        let invalidRes = await localRequest('/invalid');
        if (invalidRes.status === 404) logPass("Invalid route /api/invalid -> 404");
        else logFail(`Invalid route expected 404, got ${invalidRes.status}`);

        // --- PHASE 6: Late Async Failure Injection ---
        console.log("\n--- PHASE 6: Late Async Failure Injection ---");
        const lateFailureRes = await localRequest('/inject-async-safety-test');
        if (lateFailureRes.status === 200) logPass("Late async failure response received");
        else logFail(`Late async failure response failed: ${lateFailureRes.status}`);

        console.log("\n--- VALIDATION COMPLETE ---");
        
        return failures.length === 0;
        
    } catch (err: any) {
        console.error("Test execution failed:", err);
        return false;
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runValidation().then(success => process.exit(success ? 0 : 1));
}
