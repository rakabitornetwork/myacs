import mongoose from 'mongoose';
import config from './config/index.js';

export async function connectDatabase() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log(`[mongodb] connected to ${config.mongoUri}`);
}

export default mongoose;
