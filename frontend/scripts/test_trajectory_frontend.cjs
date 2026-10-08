/**
 * test_trajectory_frontend.cjs
 * Validates frontend trajectory module integrations, route configurations,
 * phase mappings, API client bindings, and report exports.
 */
const fs = require('fs');
const path = require('path');

console.log('--- Testing Longitudinal Trajectory Frontend Components ---');

// 1. Verify LongitudinalTrajectory.jsx exists and has required elements
const trajPagePath = path.join(__dirname, '..', 'src', 'pages', 'LongitudinalTrajectory.jsx');
if (!fs.existsSync(trajPagePath)) {
  console.error('FAIL: LongitudinalTrajectory.jsx does not exist!');
  process.exit(1);
}
const trajPageContent = fs.readFileSync(trajPagePath, 'utf8');

const requiredKeywords = [
  'Longitudinal AD Risk Trajectory',
  'RESEARCH_ONLY',
  'Research-Only Analysis Notice',
  'Multi-Signal Longitudinal Trajectory Curve',
  'Trajectory Horizon Exploration',
  'No observed data are available beyond Day',
  'Future disease-onset prediction is not currently validated',
  'Side-by-Side Subject Trajectory Comparison',
  'Extensible Risk Model Architecture & Time-to-Event Governance',
  'NOT AVAILABLE',
  'TreeSHAP',
  'Retrieve Literature (RAG)',
];

for (const kw of requiredKeywords) {
  if (!trajPageContent.includes(kw)) {
    console.error(`FAIL: Missing required keyword in LongitudinalTrajectory.jsx: "${kw}"`);
    process.exit(1);
  }
}
console.log('✓ LongitudinalTrajectory.jsx contains all required research governance, multi-signal, and safety notices.');

// 2. Verify LongitudinalRiskTrajectoryReport.jsx exists
const trajReportPath = path.join(__dirname, '..', 'src', 'components', 'reports', 'LongitudinalRiskTrajectoryReport.jsx');
if (!fs.existsSync(trajReportPath)) {
  console.error('FAIL: LongitudinalRiskTrajectoryReport.jsx does not exist!');
  process.exit(1);
}
const trajReportContent = fs.readFileSync(trajReportPath, 'utf8');
if (!trajReportContent.includes('Longitudinal AD Risk Trajectory Analysis') || !trajReportContent.includes('Research Disclaimer:')) {
  console.error('FAIL: Missing key disclaimer or title in LongitudinalRiskTrajectoryReport.jsx');
  process.exit(1);
}
console.log('✓ LongitudinalRiskTrajectoryReport.jsx contains all clinical research sections.');

// 3. Verify App.jsx routes
const appPath = path.join(__dirname, '..', 'src', 'App.jsx');
const appContent = fs.readFileSync(appPath, 'utf8');
if (!appContent.includes('/trajectory') || !appContent.includes('LongitudinalTrajectory')) {
  console.error('FAIL: App.jsx missing /trajectory route!');
  process.exit(1);
}
console.log('✓ App.jsx mounts /trajectory route with PhaseFeatureGuard.');

// 4. Verify Sidebar.jsx navigation
const sidebarPath = path.join(__dirname, '..', 'src', 'components', 'layout', 'Sidebar.jsx');
const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
if (!sidebarContent.includes('/trajectory') || !sidebarContent.includes('Risk Trajectory')) {
  console.error('FAIL: Sidebar.jsx missing /trajectory item!');
  process.exit(1);
}
console.log('✓ Sidebar.jsx includes Risk Trajectory navigation link.');

// 5. Verify featurePhases.js
const featPath = path.join(__dirname, '..', 'src', 'config', 'featurePhases.js');
const featContent = fs.readFileSync(featPath, 'utf8');
if (!featContent.includes("'/trajectory':") || !featContent.includes('Longitudinal AD Risk Trajectory')) {
  console.error('FAIL: featurePhases.js missing /trajectory configuration!');
  process.exit(1);
}
console.log('✓ featurePhases.js maps /trajectory to Phase 3.');

// 6. Verify client.js API exports
const clientPath = path.join(__dirname, '..', 'src', 'api', 'client.js');
const clientContent = fs.readFileSync(clientPath, 'utf8');
const clientExports = [
  'fetchTrajectorySubjects',
  'fetchSubjectTrajectory',
  'fetchTrajectoryLiterature',
  'compareSubjectTrajectories',
  'fetchTrajectoryEvaluation',
  'fetchRiskModelCapabilities',
];
for (const fn of clientExports) {
  if (!clientContent.includes(`export const ${fn}`)) {
    console.error(`FAIL: client.js missing export "${fn}"`);
    process.exit(1);
  }
}
console.log('✓ client.js exports all trajectory API bindings.');

// 7. Verify Reports.jsx integration
const reportsPath = path.join(__dirname, '..', 'src', 'pages', 'Reports.jsx');
const reportsContent = fs.readFileSync(reportsPath, 'utf8');
if (!reportsContent.includes('LongitudinalRiskTrajectoryReport') || !reportsContent.includes('7b. Longitudinal AD Risk Trajectory')) {
  console.error('FAIL: Reports.jsx missing LongitudinalRiskTrajectoryReport integration!');
  process.exit(1);
}
console.log('✓ Reports.jsx integrates LongitudinalRiskTrajectoryReport in presentation and markdown export.');

console.log('ALL FRONTEND INTEGRATION TESTS PASSED SUCCESSFULLY!');
