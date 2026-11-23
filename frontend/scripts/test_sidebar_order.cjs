const fs = require('fs');
const path = require('path');

const sidebarPath = path.join(__dirname, '..', 'src', 'components', 'layout', 'Sidebar.jsx');
const appPath = path.join(__dirname, '..', 'src', 'App.jsx');

console.log('--- Checking Sidebar Destinations and Order ---');
const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

const expectedOrder = [
  { to: '/overview', label: 'Overview' },
  { to: '/analyze', label: 'Analyze' },
  { to: '/patients', label: 'Patient Explorer' },
  { to: '/assistant', label: 'AIRA' },
  { to: '/research', label: 'Research & Validation' },
  { to: '/reports', label: 'Reports & Evidence' },
  { to: '/rigor', label: 'Rigor Suite' }
];

// Extract items from PRIMARY_DESTINATIONS block
const primMatch = sidebarContent.match(/const PRIMARY_DESTINATIONS = \[([\s\S]*?)\];/);
if (!primMatch) {
  console.error('Could not find PRIMARY_DESTINATIONS block in Sidebar.jsx');
  process.exit(1);
}

const itemsText = primMatch[1];
const itemRegex = /\{[\s\S]*?to:\s*'([^']+)'[\s\S]*?label:\s*'([^']+)'[\s\S]*?\}/g;
let match;
const found = [];
while ((match = itemRegex.exec(itemsText)) !== null) {
  found.push({ to: match[1], label: match[2] });
}

if (found.length !== expectedOrder.length) {
  console.error(`Expected ${expectedOrder.length} destinations, found ${found.length}`);
  process.exit(1);
}

for (let i = 0; i < expectedOrder.length; i++) {
  if (found[i].to !== expectedOrder[i].to || found[i].label !== expectedOrder[i].label) {
    console.error(`Mismatch at position ${i + 1}: expected ${expectedOrder[i].label} (${expectedOrder[i].to}), got ${found[i].label} (${found[i].to})`);
    process.exit(1);
  }
  console.log(`✓ Position ${i + 1}: ${found[i].label} -> ${found[i].to}`);
}

console.log('\n--- Checking App.jsx Route Declarations ---');
const appContent = fs.readFileSync(appPath, 'utf8');

// Ensure /assistant is mapped to ResearchAssistant
if (!appContent.includes('<Route path="/assistant" element={<ResearchAssistant />} />')) {
  console.error('App.jsx does not map /assistant to <ResearchAssistant />');
  process.exit(1);
}
console.log('✓ /assistant route renders <ResearchAssistant />');

// Ensure /assistant is NOT in Navigate redirects
if (appContent.includes('path="/assistant" element={<Navigate to="/analyze"')) {
  console.error('App.jsx still has a legacy redirect from /assistant to /analyze');
  process.exit(1);
}
console.log('✓ Legacy redirect from /assistant to /analyze removed');

console.log('\nALL SIDEBAR NAVIGATION AND ROUTE CHECKS PASSED SUCCESSFULLY!');
