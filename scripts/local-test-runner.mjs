#!/usr/bin/env node

/**
 * Local Test Runner for GAS Invoice Management System
 * Simulates GAS environment for comprehensive testing
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

console.log('🧪 GAS Invoice Management System - Local Test Runner');
console.log('=' .repeat(60));

// Test configuration
const testConfig = {
  timestamp: new Date().toISOString(),
  testResults: [],
  totalTests: 0,
  passedTests: 0,
  failedTests: 0
};

// Simulated test functions
const testSuite = [
  {
    name: 'Build Verification',
    description: 'Verify TypeScript compilation and build process',
    test: () => testBuildProcess()
  },
  {
    name: 'Code Structure Analysis',
    description: 'Analyze code structure and dependencies',
    test: () => testCodeStructure()
  },
  {
    name: 'Model Validation',
    description: 'Validate TypeScript model definitions',
    test: () => testModelValidation()
  },
  {
    name: 'Import Dependencies',
    description: 'Verify all imports and dependencies',
    test: () => testImportDependencies()
  },
  {
    name: 'Function Exports',
    description: 'Verify all required functions are exported',
    test: () => testFunctionExports()
  },
  {
    name: 'Configuration Coverage',
    description: 'Test configuration and environment setup',
    test: () => testConfigurationCoverage()
  }
];

// Test execution
async function runTests() {
  console.log(`📋 Running ${testSuite.length} test suites...\\n`);
  
  for (const test of testSuite) {
    testConfig.totalTests++;
    console.log(`🔍 ${test.name}: ${test.description}`);
    
    try {
      const result = await test.test();
      if (result.passed) {
        testConfig.passedTests++;
        console.log(`   ✅ PASS - ${result.message}`);
      } else {
        testConfig.failedTests++;
        console.log(`   ❌ FAIL - ${result.message}`);
      }
      
      testConfig.testResults.push({
        name: test.name,
        passed: result.passed,
        message: result.message,
        details: result.details || {}
      });
    } catch (error) {
      testConfig.failedTests++;
      console.log(`   💥 ERROR - ${error.message}`);
      testConfig.testResults.push({
        name: test.name,
        passed: false,
        message: error.message,
        details: { error: error.toString() }
      });
    }
    console.log('');
  }
  
  generateTestReport();
}

// Test functions
function testBuildProcess() {
  try {
    execSync('npm run build', { stdio: 'pipe' });
    const stats = execSync('ls -la dist/main.js', { stdio: 'pipe' }).toString();
    const sizeMB = (parseFloat(stats.match(/\\s+(\\d+)\\s+/)[1]) / 1024 / 1024).toFixed(2);
    
    return {
      passed: true,
      message: `Build successful, output size: ${sizeMB}MB`,
      details: { buildOutput: stats.trim() }
    };
  } catch (error) {
    return {
      passed: false,
      message: `Build failed: ${error.message}`
    };
  }
}

function testCodeStructure() {
  try {
    const sourceFiles = execSync('find src -name "*.ts" | wc -l', { stdio: 'pipe' }).toString().trim();
    const totalLines = execSync('find src -name "*.ts" -exec wc -l {} + | tail -1', { stdio: 'pipe' })
      .toString().match(/\\s*(\\d+)\\s+total/)?.[1] || '0';
    
    const expectedStructure = [
      'src/models',
      'src/repositories', 
      'src/services',
      'src/ui',
      'src/utils'
    ];
    
    const missingDirs = expectedStructure.filter(dir => {
      try {
        execSync(`ls ${dir}`, { stdio: 'pipe' });
        return false;
      } catch {
        return true;
      }
    });
    
    if (missingDirs.length > 0) {
      return {
        passed: false,
        message: `Missing directories: ${missingDirs.join(', ')}`
      };
    }
    
    return {
      passed: true,
      message: `Code structure valid: ${sourceFiles} files, ${totalLines} lines`,
      details: { sourceFiles: parseInt(sourceFiles), totalLines: parseInt(totalLines) }
    };
  } catch (error) {
    return {
      passed: false,
      message: `Structure analysis failed: ${error.message}`
    };
  }
}

function testModelValidation() {
  try {
    const customerModel = readFileSync('src/models/customer.model.ts', 'utf8');
    const invoiceModel = readFileSync('src/models/invoice.model.ts', 'utf8');
    
    const requiredCustomerFields = ['customerId', 'companyName', 'registeredAt'];
    const requiredInvoiceFields = ['invoiceNumber', 'customerId', 'totalAmount', 'status'];
    
    const customerValidation = requiredCustomerFields.every(field => 
      customerModel.includes(field)
    );
    
    const invoiceValidation = requiredInvoiceFields.every(field => 
      invoiceModel.includes(field)
    );
    
    if (!customerValidation || !invoiceValidation) {
      return {
        passed: false,
        message: 'Required model fields missing'
      };
    }
    
    // Check for enum definitions
    const hasInvoiceStatus = invoiceModel.includes('enum InvoiceStatus');
    
    return {
      passed: true,
      message: `Models validated: Customer and Invoice interfaces complete, InvoiceStatus enum: ${hasInvoiceStatus}`,
      details: { customerValidation, invoiceValidation, hasInvoiceStatus }
    };
  } catch (error) {
    return {
      passed: false,
      message: `Model validation failed: ${error.message}`
    };
  }
}

function testImportDependencies() {
  try {
    const mainFile = readFileSync('src/main.ts', 'utf8');
    const indexFile = readFileSync('src/index.ts', 'utf8');
    
    const requiredImports = [
      'CustomerUI',
      'InvoiceUI', 
      'initializeSpreadsheet',
      'checkSpreadsheetInitialization'
    ];
    
    const missingImports = requiredImports.filter(imp => 
      !mainFile.includes(imp)
    );
    
    const hasExports = [
      'models',
      'repositories',
      'services',
      'ui',
      'utils'
    ].every(module => indexFile.includes(`export * from './${module}'`));
    
    if (missingImports.length > 0) {
      return {
        passed: false,
        message: `Missing imports in main.ts: ${missingImports.join(', ')}`
      };
    }
    
    return {
      passed: true,
      message: `Import dependencies validated, index exports: ${hasExports}`,
      details: { requiredImports, hasExports }
    };
  } catch (error) {
    return {
      passed: false,
      message: `Import validation failed: ${error.message}`
    };
  }
}

function testFunctionExports() {
  try {
    const mainFile = readFileSync('src/main.ts', 'utf8');
    
    const requiredFunctions = [
      'onOpen',
      'testFunction',
      'runTestsWithLogs',
      'testSpreadsheetInitialization',
      'testCustomerManagement',
      'testInvoiceManagement',
      'showCustomerList',
      'showInvoiceList',
      'showCustomerRegistration',
      'showInvoiceCreation'
    ];
    
    const exportedFunctions = requiredFunctions.filter(func => 
      mainFile.includes(`export function ${func}`)
    );
    
    const coverage = (exportedFunctions.length / requiredFunctions.length * 100).toFixed(1);
    
    if (exportedFunctions.length < requiredFunctions.length) {
      const missing = requiredFunctions.filter(func => !exportedFunctions.includes(func));
      return {
        passed: false,
        message: `Missing function exports: ${missing.join(', ')} (${coverage}% coverage)`
      };
    }
    
    return {
      passed: true,
      message: `All required functions exported (${coverage}% coverage)`,
      details: { requiredFunctions, exportedFunctions, coverage }
    };
  } catch (error) {
    return {
      passed: false,
      message: `Function export validation failed: ${error.message}`
    };
  }
}

function testConfigurationCoverage() {
  try {
    const configFile = readFileSync('src/config.ts', 'utf8');
    const packageFile = readFileSync('package.json', 'utf8');
    
    const hasConfigManager = configFile.includes('class ConfigManager') || configFile.includes('getSpreadsheetConfig');
    const hasEnvironments = configFile.includes('ENVIRONMENT') || configFile.includes('DEBUG_MODE');
    
    const packageJson = JSON.parse(packageFile);
    const hasRequiredDeps = [
      '@types/google-apps-script',
      'typescript',
      'esbuild'
    ].every(dep => packageJson.devDependencies?.[dep]);
    
    const hasScripts = [
      'build',
      'push:dev',
      'test'
    ].every(script => packageJson.scripts?.[script]);
    
    return {
      passed: hasConfigManager && hasEnvironments && hasRequiredDeps && hasScripts,
      message: `Config: ${hasConfigManager}, Env: ${hasEnvironments}, Deps: ${hasRequiredDeps}, Scripts: ${hasScripts}`,
      details: { 
        hasConfigManager, 
        hasEnvironments, 
        hasRequiredDeps, 
        hasScripts,
        dependencies: Object.keys(packageJson.devDependencies || {}).length
      }
    };
  } catch (error) {
    return {
      passed: false,
      message: `Configuration validation failed: ${error.message}`
    };
  }
}

function generateTestReport() {
  const report = {
    ...testConfig,
    summary: {
      totalTests: testConfig.totalTests,
      passed: testConfig.passedTests,
      failed: testConfig.failedTests,
      successRate: ((testConfig.passedTests / testConfig.totalTests) * 100).toFixed(1)
    },
    generatedAt: new Date().toISOString()
  };
  
  // Write JSON report
  writeFileSync('test-results.json', JSON.stringify(report, null, 2));
  
  // Console summary
  console.log('📊 Test Execution Summary');
  console.log('=' .repeat(40));
  console.log(`Total Tests: ${report.summary.totalTests}`);
  console.log(`Passed: ${report.summary.passed} ✅`);
  console.log(`Failed: ${report.summary.failed} ❌`);
  console.log(`Success Rate: ${report.summary.successRate}%`);
  console.log('');
  
  if (report.summary.failed > 0) {
    console.log('❌ Failed Tests:');
    report.testResults
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`   • ${test.name}: ${test.message}`);
      });
    console.log('');
  }
  
  console.log(`📁 Detailed results saved to: test-results.json`);
  console.log(`📄 Coverage report available: test-coverage-report.md`);
  
  const overallGrade = report.summary.successRate >= 90 ? 'A' :
                      report.summary.successRate >= 80 ? 'B' :
                      report.summary.successRate >= 70 ? 'C' :
                      report.summary.successRate >= 60 ? 'D' : 'F';
                      
  console.log(`\\n🎯 Overall Grade: ${overallGrade} (${report.summary.successRate}%)`);
  
  return report;
}

// Execute tests
runTests().catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});