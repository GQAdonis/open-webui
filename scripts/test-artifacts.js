#!/usr/bin/env node

/**
 * Comprehensive Artifact System Test Runner
 *
 * This script runs all artifact-related tests in the correct order
 * and provides detailed reporting on system functionality.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  unitTests: {
    command: 'npm',
    args: ['run', 'test:unit', '--', '--grep', 'Artifact'],
    description: 'Unit tests for FSM, parsers, and utilities'
  },
  integrationTests: {
    command: 'npm',
    args: ['run', 'test:unit', '--', '--grep', 'integration'],
    description: 'Integration tests for component interactions'
  },
  e2eTests: {
    command: 'npx',
    args: ['playwright', 'test', 'tests/e2e/artifact-workflow.e2e.ts'],
    description: 'End-to-end workflow tests'
  },
  performanceTests: {
    command: 'npx',
    args: ['playwright', 'test', 'tests/e2e/artifact-performance.e2e.ts'],
    description: 'Performance and stress tests'
  }
};

// Test results tracking
const testResults = {
  unit: { status: 'pending', output: '', duration: 0 },
  integration: { status: 'pending', output: '', duration: 0 },
  e2e: { status: 'pending', output: '', duration: 0 },
  performance: { status: 'pending', output: '', duration: 0 }
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',      // cyan
    success: '\x1b[32m',   // green
    error: '\x1b[31m',     // red
    warning: '\x1b[33m',   // yellow
    reset: '\x1b[0m'       // reset
  };

  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

function runCommand(command, args, description) {
  return new Promise((resolve, reject) => {
    log(`Starting: ${description}`, 'info');
    const startTime = Date.now();

    const process = spawn(command, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(data.toString());
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(data.toString());
    });

    process.on('close', (code) => {
      const duration = Date.now() - startTime;
      const output = stdout + stderr;

      if (code === 0) {
        log(`✅ Completed: ${description} (${duration}ms)`, 'success');
        resolve({ status: 'passed', output, duration });
      } else {
        log(`❌ Failed: ${description} (${duration}ms)`, 'error');
        resolve({ status: 'failed', output, duration, exitCode: code });
      }
    });

    process.on('error', (error) => {
      log(`💥 Error running: ${description} - ${error.message}`, 'error');
      reject(error);
    });
  });
}

function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: Object.keys(testResults).length,
      passed: 0,
      failed: 0,
      totalDuration: 0
    },
    details: testResults,
    recommendations: []
  };

  // Calculate summary
  Object.values(testResults).forEach(result => {
    if (result.status === 'passed') report.summary.passed++;
    if (result.status === 'failed') report.summary.failed++;
    report.summary.totalDuration += result.duration;
  });

  // Generate recommendations
  if (report.summary.failed === 0) {
    report.recommendations.push('🎉 All tests passed! The artifact system is ready for production.');
  } else {
    report.recommendations.push('⚠️ Some tests failed. Review failures before deployment.');

    if (testResults.unit.status === 'failed') {
      report.recommendations.push('🔧 Unit test failures indicate core logic issues. Fix FSM or parser bugs.');
    }

    if (testResults.integration.status === 'failed') {
      report.recommendations.push('🔗 Integration test failures suggest component interaction issues.');
    }

    if (testResults.e2e.status === 'failed') {
      report.recommendations.push('🌐 E2E test failures indicate full workflow problems.');
    }

    if (testResults.performance.status === 'failed') {
      report.recommendations.push('⚡ Performance test failures suggest optimization is needed.');
    }
  }

  return report;
}

function saveReport(report) {
  const reportDir = path.join(__dirname, '../test-results');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportFile = path.join(reportDir, `artifact-test-report-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

  const summaryFile = path.join(reportDir, 'latest-test-summary.txt');
  const summaryContent = `
Artifact System Test Report
Generated: ${report.timestamp}

SUMMARY:
========
Total Tests: ${report.summary.total}
Passed: ${report.summary.passed}
Failed: ${report.summary.failed}
Total Duration: ${report.summary.totalDuration}ms

RESULTS:
========
Unit Tests: ${testResults.unit.status} (${testResults.unit.duration}ms)
Integration Tests: ${testResults.integration.status} (${testResults.integration.duration}ms)
E2E Tests: ${testResults.e2e.status} (${testResults.e2e.duration}ms)
Performance Tests: ${testResults.performance.status} (${testResults.performance.duration}ms)

RECOMMENDATIONS:
===============
${report.recommendations.join('\n')}

DEPLOYMENT READY: ${report.summary.failed === 0 ? 'YES ✅' : 'NO ❌'}
  `.trim();

  fs.writeFileSync(summaryFile, summaryContent);

  log(`📊 Report saved to: ${reportFile}`, 'info');
  log(`📋 Summary saved to: ${summaryFile}`, 'info');
}

function printFinalSummary(report) {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 ARTIFACT SYSTEM TEST RESULTS');
  console.log('='.repeat(60));

  console.log(`\n📊 Summary:`);
  console.log(`   Total Tests: ${report.summary.total}`);
  console.log(`   Passed: ${report.summary.passed} ✅`);
  console.log(`   Failed: ${report.summary.failed} ${report.summary.failed > 0 ? '❌' : ''}`);
  console.log(`   Duration: ${report.summary.totalDuration}ms`);

  console.log(`\n🔍 Test Results:`);
  Object.entries(testResults).forEach(([type, result]) => {
    const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏳';
    console.log(`   ${type.padEnd(12)}: ${icon} ${result.status} (${result.duration}ms)`);
  });

  console.log(`\n💡 Recommendations:`);
  report.recommendations.forEach(rec => {
    console.log(`   ${rec}`);
  });

  console.log(`\n🚀 Deployment Status: ${report.summary.failed === 0 ? 'READY ✅' : 'NOT READY ❌'}`);
  console.log('='.repeat(60) + '\n');
}

// Main test execution
async function runAllTests() {
  log('🚀 Starting comprehensive artifact system tests...', 'info');

  try {
    // Run tests in sequence for proper isolation
    log('\n1️⃣ Running Unit Tests...', 'info');
    testResults.unit = await runCommand(
      TEST_CONFIG.unitTests.command,
      TEST_CONFIG.unitTests.args,
      TEST_CONFIG.unitTests.description
    );

    log('\n2️⃣ Running Integration Tests...', 'info');
    testResults.integration = await runCommand(
      TEST_CONFIG.integrationTests.command,
      TEST_CONFIG.integrationTests.args,
      TEST_CONFIG.integrationTests.description
    );

    log('\n3️⃣ Running E2E Tests...', 'info');
    testResults.e2e = await runCommand(
      TEST_CONFIG.e2eTests.command,
      TEST_CONFIG.e2eTests.args,
      TEST_CONFIG.e2eTests.description
    );

    log('\n4️⃣ Running Performance Tests...', 'info');
    testResults.performance = await runCommand(
      TEST_CONFIG.performanceTests.command,
      TEST_CONFIG.performanceTests.args,
      TEST_CONFIG.performanceTests.description
    );

  } catch (error) {
    log(`💥 Fatal error during test execution: ${error.message}`, 'error');
    process.exit(1);
  }

  // Generate and save report
  const report = generateReport();
  saveReport(report);
  printFinalSummary(report);

  // Exit with appropriate code
  process.exit(report.summary.failed === 0 ? 0 : 1);
}

// Handle CLI arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Artifact System Test Runner

Usage: node scripts/test-artifacts.js [options]

Options:
  --help, -h     Show this help message
  --unit         Run only unit tests
  --integration  Run only integration tests
  --e2e          Run only E2E tests
  --performance  Run only performance tests
  --report       Generate report from existing results

Examples:
  node scripts/test-artifacts.js                 # Run all tests
  node scripts/test-artifacts.js --unit          # Run only unit tests
  node scripts/test-artifacts.js --performance   # Run only performance tests
  `);
  process.exit(0);
}

// Run specific test types if requested
if (args.includes('--unit')) {
  log('Running unit tests only...', 'info');
  runCommand(TEST_CONFIG.unitTests.command, TEST_CONFIG.unitTests.args, TEST_CONFIG.unitTests.description)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else if (args.includes('--integration')) {
  log('Running integration tests only...', 'info');
  runCommand(TEST_CONFIG.integrationTests.command, TEST_CONFIG.integrationTests.args, TEST_CONFIG.integrationTests.description)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else if (args.includes('--e2e')) {
  log('Running E2E tests only...', 'info');
  runCommand(TEST_CONFIG.e2eTests.command, TEST_CONFIG.e2eTests.args, TEST_CONFIG.e2eTests.description)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else if (args.includes('--performance')) {
  log('Running performance tests only...', 'info');
  runCommand(TEST_CONFIG.performanceTests.command, TEST_CONFIG.performanceTests.args, TEST_CONFIG.performanceTests.description)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  // Run all tests
  runAllTests();
}