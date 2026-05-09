const { io } = require('socket.io-client');
const fs = require('fs');
const path = require('path');

const validStatuses = ['online', 'offline', 'busy', 'paper_out', 'toner_low', 'jam', 'error'];
const status = process.argv[2];

if (!status || !validStatuses.includes(status.toLowerCase())) {
  console.log('Usage: node simulate.js <status>');
  console.log('Valid statuses:', validStatuses.join(', '));
  process.exit(1);
}

const shopId = 'shop_local_dev';
const printerId = 'dummy-printer'; // ID of the Simulated Cloud Printer

// PERSISTENCE: Write to the file that the Agent's HealthMonitor watches
console.log(`[+] Writing persistent status "${status}" to dummy_status.txt...`);
fs.writeFileSync(path.join(__dirname, 'dummy_status.txt'), status.toLowerCase());

console.log('Connecting to QuickPrint Backend...');
const socket = io('http://localhost:4000/realtime', {
  transports: ['websocket'],
  auth: { token: 'dev-token', shopId, role: 'AGENT' },
});

socket.on('connect', () => {
  console.log(`[+] Authenticated to backend!`);
  console.log(`[+] Target Printer: ${printerId}`);
  console.log(`[+] Injecting Status: ${status.toUpperCase()}`);
  
  socket.emit('agent:printer-event', {
    printerId,
    status: status.toLowerCase(),
    detail: 'Manual simulation trigger via control script',
  });
  
  setTimeout(() => {
    console.log('[+] Broadcasted successfully! Check your Admin UI.');
    socket.disconnect();
    process.exit(0);
  }, 1000);
});

socket.on('connect_error', (err) => {
  console.error('[-] Connection failed:', err.message);
  process.exit(1);
});
