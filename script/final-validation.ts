import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || '3001';
const TEST_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const CHECK_INTERVAL_MS = 5000;

let serverProcess: any;
let failures: string[] = [];
let startTime = Date.now();

let serverReady = false;

async function runRequest(path: string) {
    return new Promise((resolve, reject) => {
        const req = http.request(`http://localhost:${PORT}${path}`, {
            method: 'GET',
            timeout: 5000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
        req.end();
    });
}

async function startServer() {
    console.log("🚀 Starting server for final validation...");
    serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
        cwd: ROOT,
        env: { ...process.env, PORT: PORT, NODE_ENV: 'development' },
        shell: true
    });

    serverProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        process.stdout.write(output);
        if (serverReady && output.includes('FAIL:')) {
            const match = output.match(/FAIL: .+/);
            if (match) {
                failures.push(match[0]);
            }
        }
    });

    serverProcess.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        process.stderr.write(output);
        if (serverReady && output.includes('FAIL:')) {
            failures.push(output.trim());
        }
        if (output.includes('unhandledRejection') || output.includes('uncaughtException')) {
            failures.push(`Process Error: ${output.trim()}`);
        }
    });

    serverProcess.on('exit', (code: number) => {
        if (code !== 0 && code !== null) {
            failures.push(`Server crashed with code ${code}`);
        }
    });

    // Wait for server to be ready
    for (let i = 0; i < 60; i++) {
        try {
            await runRequest('/api/auth/me'); // Just a health check
            serverReady = true;
            break;
        } catch (e) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    if (!serverReady) {
        console.error("❌ Server failed to start in time (60s)");
        process.exit(1);
    }
    console.log("✅ Server ready. Starting 10-minute stability test...");
}

async function runValidation() {
    await startServer();

    const interval = setInterval(async () => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, TEST_DURATION_MS - elapsed);
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);

        console.log(`\n--- [Status] Time Remaining: ${mins}m ${secs}s ---`);
        console.log(`Current Failures: ${failures.length}`);

        if (failures.length > 0) {
            console.error("❌ VALIDATION FAILED: Anomalies detected!");
            failures.forEach(f => console.error(`  - ${f}`));
            cleanup();
            process.exit(1);
        }

        // Periodic Load Simulation
        try {
            // Added WS disconnect storm simulation to trigger integrity checks
            const wsUrl = `http://localhost:${PORT}`;
            const { io } = await import('socket.io-client');
            const socket = io(wsUrl, { transports: ['websocket'], auth: { token: 'invalid' } });
            socket.on('connect', () => {
                socket.emit('test_event');
                socket.emit('test_event');
                socket.emit('test_event');
                socket.emit('test_event');
                socket.emit('test_event');
                socket.emit('test_event'); // Should trigger duplicate event fail
                socket.disconnect();
            });

            await Promise.all([
                runRequest('/api/auth/me'),
                runRequest('/api/quizzes'),
                runRequest('/inject-async-safety-test')
            ]);
        } catch (e) {
            // console.warn("Load request failed:", e.message);
        }

        if (elapsed >= TEST_DURATION_MS) {
            clearInterval(interval);
            console.log("\n✅ FINAL PASS CONDITION MET!");
            console.log("System remained stable for full duration.");
            cleanup();
            process.exit(0);
        }
    }, CHECK_INTERVAL_MS);
}

function cleanup() {
    if (serverProcess) {
        console.log("Stopping server...");
        serverProcess.kill();
    }
}

process.on('SIGINT', () => {
    cleanup();
    process.exit(1);
});

runValidation().catch(err => {
    console.error("Validation script error:", err);
    cleanup();
    process.exit(1);
});
