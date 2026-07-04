require('dotenv').config();
const { isFirebaseConfigured, uploadToFirebase } = require('./config/firebase');

async function testFirebase() {
  console.log("=== Checking Firebase Configuration ===");
  console.log("Project ID:", process.env.FIREBASE_PROJECT_ID ? "Provided" : "MISSING");
  console.log("Client Email:", process.env.FIREBASE_CLIENT_EMAIL ? "Provided" : "MISSING");
  console.log("Private Key:", process.env.FIREBASE_PRIVATE_KEY ? "Provided" : "MISSING");
  console.log("Storage Bucket:", process.env.FIREBASE_STORAGE_BUCKET ? "Provided" : "MISSING");
  console.log("Is Configured status:", isFirebaseConfigured);

  if (!isFirebaseConfigured) {
    console.error("\n❌ Firebase is NOT configured. Please add the required environment variables to your .env file or Netlify settings.");
    return;
  }

  try {
    console.log("\nTrying to upload a test file to Firebase Storage...");
    const testContent = Buffer.from("Firebase storage is working correctly! " + new Date().toISOString(), "utf8");
    const filename = `connection-test-${Date.now()}.txt`;
    
    const publicUrl = await uploadToFirebase(testContent, filename, "text/plain");
    
    if (publicUrl) {
      console.log("✅ Upload successful!");
      console.log("Public URL of test file:", publicUrl);
      console.log("\nYou can open this URL in your browser to verify it loads correctly.");
    } else {
      console.error("❌ Upload failed: Did not return a public URL.");
    }
  } catch (err) {
    console.error("❌ Firebase verification failed with error:", err.message);
  }
}

testFirebase();
