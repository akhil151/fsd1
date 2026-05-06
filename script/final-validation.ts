import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { runValidation as runPhases } from './system-validation';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || '3001';

// Modes: 'final' (default) or 'soak'
const MODE = process.env.VALIDATION_MODE || 'final';
const SOAK_DURATION_MINS = parseInt(process.env.SOAK_DURATION_MINS || "10", 10);

let serverProcess: any;
let failures: string[] = [];
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
    console.log(`🚀 Starting server for ${MODE} validation on port ${PORT}...`);
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
            if (match) failures.push(match[0]);
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

    // Wait for server to be ready
    for (let i = 0; i < 60; i++) {
        try {
            await runRequest('/api/auth/me');
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
    console.log("✅ Server ready.");
}

async function main() {
    await startServer();

    console.log(`\n--- Running Validation Phases (${MODE} mode) ---`);
    
    const options = {
        port: PORT,
        durationMins: MODE === 'soak' ? SOAK_DURATION_MINS : 0
    };

    const success = await runPhases(options);

    if (failures.length > 0 || !success) {
        console.error("\n❌ VALIDATION FAILED!");
        failures.forEach(f => console.error(`  - ${f}`));
        await cleanup();
        process.exit(1);
    }

    console.log(`\n✅ ${MODE.toUpperCase()} VALIDATION COMPLETE!`);
    await cleanup();
    process.exit(0);
}

async function cleanup() {
    if (serverProcess) {
        console.log("Stopping server...");
        // Send SIGINT for graceful shutdown we implemented in index.ts
        serverProcess.kill('SIGINT');
        
        // Wait a bit for the process to exit
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (!serverProcess.killed) {
            serverProcess.kill('SIGKILL');
        }
    }
}

process.on('SIGINT', async () => {
    await cleanup();
    process.exit(1);
});

main().catch(async err => {
    console.error("Validation script error:", err);
    await cleanup();
    process.exit(1);
});
