import mongoose from 'mongoose';

const cwmpSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    deviceId: { type: String, required: true, index: true },
    ipAddress: { type: String, index: true },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

cwmpSessionSchema.index({ lastSeen: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model('CwmpSession', cwmpSessionSchema);
