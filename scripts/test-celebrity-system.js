/**
 * Test runner for the celebrity image extraction and avatar generation system
 * Run this script to verify all components are working correctly
 */

const { celebritySystemTester } = require('../lib/test-celebrity-system');
const { logger } = require('../lib/logger');

async function runTests() {
  console.log('🚀 Starting Celebrity System Tests...');
  console.log('=' .repeat(60));
  
  try {
    // Run quick health check first
    console.log('\n🔍 Running quick health check...');
    const healthCheck = await celebritySystemTester.quickHealthCheck();
    
    console.log('\n📊 Health Check Results:');
    console.log(`   Google Search API: ${healthCheck.googleSearch ? '✅ Working' : '❌ Failed'}`);
    console.log(`   Gemini API: ${healthCheck.geminiApi ? '✅ Working' : '❌ Failed'}`);
    console.log(`   Image Processing: ${healthCheck.imageProcessing ? '✅ Working' : '❌ Failed'}`);
    console.log(`   Overall Health: ${getHealthEmoji(healthCheck.overallHealth)} ${healthCheck.overallHealth.toUpperCase()}`);
    
    if (healthCheck.overallHealth === 'unhealthy') {
      console.log('\n⚠️ System is unhealthy. Please check your API configurations before running full tests.');
      console.log('\nCommon issues:');
      console.log('   - Missing or invalid Google Custom Search API key');
      console.log('   - Missing or invalid Gemini API key');
      console.log('   - Network connectivity issues');
      console.log('   - API quota exceeded');
      return;
    }
    
    // Run full system tests
    console.log('\n🧪 Running comprehensive system tests...');
    console.log('This may take a few minutes...');
    
    const testReport = await celebritySystemTester.runFullSystemTest();
    
    // Display results
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n📊 Overall Status: ${testReport.overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`📈 Tests Passed: ${testReport.passedTests}/${testReport.totalTests}`);
    console.log(`⏱️ Total Duration: ${Math.round(testReport.totalDuration / 1000)}s`);
    
    // Individual test results
    console.log('\n📝 Individual Test Results:');
    testReport.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = Math.round(result.duration / 1000);
      console.log(`   ${status} ${result.testName} (${duration}s)`);
      
      if (!result.success && result.error) {
        console.log(`      Error: ${result.error}`);
      }
      
      if (result.data) {
        const dataStr = Object.entries(result.data)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        console.log(`      Data: ${dataStr}`);
      }
    });
    
    // Component status
    console.log('\n🔧 Component Status:');
    console.log(`   Google Search: ${testReport.summary.googleSearchWorking ? '✅' : '❌'}`);
    console.log(`   Gemini API: ${testReport.summary.geminiApiWorking ? '✅' : '❌'}`);
    console.log(`   Image Processing: ${testReport.summary.imageProcessingWorking ? '✅' : '❌'}`);
    console.log(`   Avatar Pipeline: ${testReport.summary.pipelineWorking ? '✅' : '❌'}`);
    console.log(`   Error Handling: ${testReport.summary.errorHandlingWorking ? '✅' : '❌'}`);
    console.log(`   Fallback Systems: ${testReport.summary.fallbacksWorking ? '✅' : '❌'}`);
    
    // Recommendations
    if (testReport.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      testReport.recommendations.forEach(rec => {
        console.log(`   ${rec}`);
      });
    }
    
    // Next steps
    console.log('\n🎯 Next Steps:');
    if (testReport.overallSuccess) {
      console.log('   ✅ All tests passed! Your system is ready for use.');
      console.log('   🚀 You can now use the celebrity image extraction API.');
      console.log('   📖 Check the API documentation for usage examples.');
    } else {
      console.log('   ⚠️ Some tests failed. Please address the issues above.');
      console.log('   🔧 Check your environment variables and API configurations.');
      console.log('   📞 Contact support if issues persist.');
    }
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('   1. Ensure all dependencies are installed: npm install');
    console.error('   2. Check your .env file configuration');
    console.error('   3. Verify API keys are valid and have sufficient quota');
    console.error('   4. Check network connectivity');
    
    if (error.stack) {
      console.error('\n📋 Full error details:');
      console.error(error.stack);
    }
  }
}

function getHealthEmoji(health) {
  switch (health) {
    case 'healthy': return '🟢';
    case 'degraded': return '🟡';
    case 'unhealthy': return '🔴';
    default: return '⚪';
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().then(() => {
    console.log('\n✨ Test execution completed.');
    process.exit(0);
  }).catch(error => {
    console.error('\n💥 Fatal error during test execution:', error);
    process.exit(1);
  });
}

module.exports = { runTests };