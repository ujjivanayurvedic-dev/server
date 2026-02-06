const { performScrapingTask } = require("./controllers/scrape.controller");

// Simple cron job executor
const runCronJob = async () => {
  console.log(`🚀 Cron job started at ${new Date().toISOString()}`);
  
  try {
    const result = await performScrapingTask();
    
    if (result.success) {
      console.log(`✅ Cron job completed successfully. Records: ${result.totalRecords}`);
    } else {
      console.error(`❌ Cron job failed: ${result.message}`);
    }
    
    return result;
  } catch (error) {
    console.error("🔥 Cron job execution error:", error);
    return { success: false, error: error.message };
  }
};

// For direct execution (node cronJob.js)
if (require.main === module) {
  runCronJob().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = runCronJob;