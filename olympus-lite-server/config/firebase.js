const admin = require('firebase-admin');
const path = require('path');

let bucket = null;
const isFirebaseConfigured = !!(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY &&
  process.env.FIREBASE_STORAGE_BUCKET
);

if (isFirebaseConfigured) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
    bucket = admin.storage().bucket();
    console.log("Firebase Admin successfully initialized.");
  } catch (err) {
    console.error("Error initializing Firebase Admin:", err);
  }
} else {
  console.log("Firebase Storage credentials not fully provided. Falling back to local filesystem storage.");
}

/**
 * Uploads a file buffer to Firebase Storage.
 * @param {Buffer} fileBuffer - The file content as a Buffer.
 * @param {string} destFileName - The destination filename in the bucket.
 * @param {string} mimeType - The mime type of the file.
 * @returns {Promise<string|null>} - The public URL of the uploaded file, or null if Firebase is not configured.
 */
async function uploadToFirebase(fileBuffer, destFileName, mimeType) {
  if (!bucket) {
    return null;
  }

  try {
    const file = bucket.file(destFileName);
    await file.save(fileBuffer, {
      metadata: {
        contentType: mimeType,
      },
      resumable: false
    });

    try {
      await file.makePublic();
    } catch (makePublicErr) {
      console.warn(
        "Could not make file public using IAM. Please ensure your Firebase Storage bucket has public read access rules configured:",
        makePublicErr.message
      );
    }

    // Return the standard Google Cloud Storage public URL
    return `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/${destFileName}`;
  } catch (err) {
    console.error("Firebase upload failed:", err);
    throw err;
  }
}

module.exports = {
  isFirebaseConfigured: !!bucket,
  uploadToFirebase
};
