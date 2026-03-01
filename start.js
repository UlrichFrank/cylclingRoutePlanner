#!/usr/bin/env node

import { spawn } from 'child_process';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Find an available port starting from the given port
 */
async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 100; port++) {
    try {
      const isAvailable = await checkPortAvailable(port);
      if (isAvailable) {
        return port;
      }
    } catch (err) {
      continue;
    }
  }
  throw new Error(`No available ports found starting from ${startPort}`);
}

/**
 * Check if a port is available
 */
function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Start a process with environment variables
 */
function startProcess(name, command, args, env) {
  console.log(`\n🚀 Starting ${name}...`);
  console.log(`   Command: ${command} ${args.join(' ')}`);
  
  const proc = spawn(command, args, {
    cwd: env.CWD,
    env: { ...globalThis.process.env, ...env },
    stdio: 'inherit',
    shell: true,
  });

  proc.on('error', (err) => {
    console.error(`❌ ${name} error:`, err.message);
  });

  proc.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ ${name} exited with code ${code}`);
    }
  });

  return proc;
}

/**
 * Main function
 */
async function main() {
  console.log('🎯 travelAgent Development Server Launcher');
  console.log('==========================================\n');

  // Find available ports
  console.log('🔍 Checking available ports...');
  
  let backendPort = 3001;
  let frontendPort = 5173;

  try {
    backendPort = await findAvailablePort(3001);
    console.log(`✅ Backend port: ${backendPort}`);
  } catch (err) {
    console.error('❌ Could not find available backend port:', err.message);
    process.exit(1);
  }

  try {
    frontendPort = await findAvailablePort(5173);
    console.log(`✅ Frontend port: ${frontendPort}`);
  } catch (err) {
    console.error('❌ Could not find available frontend port:', err.message);
    process.exit(1);
  }

  // Start backend
  const backendProcess = startProcess(
    'Backend Server',
    'npm',
    ['start'],
    {
      PORT: backendPort,
      CWD: path.join(__dirname, 'server'),
    }
  );

  // Wait a bit for backend to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Update environment for frontend with backend URL
  const backendUrl = `http://localhost:${backendPort}/api`;
  
  // Start frontend
  const frontendProcess = startProcess(
    'Frontend Development Server',
    'pnpm',
    ['dev', '--', '--port', frontendPort.toString()],
    {
      VITE_BACKEND_API_URL: backendUrl,
      CWD: __dirname,
    }
  );

  console.log('\n✅ Both servers started!');
  console.log(`\n📱 Frontend: http://localhost:${frontendPort}`);
  console.log(`🔧 Backend API: ${backendUrl}`);
  console.log(`\n💡 Press Ctrl+C to stop both servers\n`);

  // Handle graceful shutdown
  const shutdown = () => {
    console.log('\n\n⏹️  Shutting down servers...');
    backendProcess.kill();
    frontendProcess.kill();
    setTimeout(() => process.exit(0), 1000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep the process alive
  await new Promise(() => {});
}

main().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
