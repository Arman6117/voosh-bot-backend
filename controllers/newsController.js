import { exec } from "child_process";

export const refreshNews = (req, res) => {
  console.log("🔄 Manual refresh triggered...");
  const scriptCommand = "node ./ingest.js"; 

  exec(scriptCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Ingestion Error: ${error.message}`);
      return res.status(500).json({ 
        error: "Ingestion failed", 
        details: stderr 
      });
    }
    console.log(`✅ Ingestion Output: ${stdout}`);
    res.json({ 
      status: "Success", 
      message: "News database updated successfully!", 
      log: stdout 
    });
  });
};