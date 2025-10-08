import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- IMPORT YOUR MODELS ---
// Make sure the paths to your models are correct. They should point from this script
// back to the root and then to your models folder.
import User from '../models/User.js';
import Medicine from '../models/Medicine.js';

// --- ROBUST .ENV PATH CONFIGURATION ---
// This block of code ensures that the script finds the .env file in your project root,
// no matter where you run the script from.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });


// --- PRE-RUN CHECK ---
// A clear check to ensure the MONGO_URI was loaded successfully.
if (!process.env.MONGO_URI) {
  console.error('❌ FATAL ERROR: MONGO_URI is not defined in your .env file.');
  console.error('Please make sure you have a .env file in the project root with the MONGO_URI variable set.');
  process.exit(1); // Exit immediately if the URI is missing
}

/**
 * Connects to the MongoDB database.
 */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for cleanup...');
  } catch (err) {
    console.error(`Database Connection Error: ${err.message}`);
    process.exit(1);
  }
};


/**
 * Deletes all documents from the specified collections.
 */
const deleteData = async () => {
  try {
    await connectDB();

    console.log('Deleting all User data...');
    await User.deleteMany({}); // An empty filter matches all documents
    console.log('✅ User data successfully deleted.');

    console.log('Deleting all Medicine data...');
    await Medicine.deleteMany({});
    console.log('✅ Medicine data successfully deleted.');

    console.log('\nCleanup process finished successfully.');
    process.exit(0);

  } catch (error) {
    console.error(`❌ Error during data deletion: ${error.message}`);
    process.exit(1);
  }
};

// --- RUN THE SCRIPT ---
console.log('Starting the cleanup process...');
deleteData();

