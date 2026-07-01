import mongoose from 'mongoose';

const faultSchema = new mongoose.Schema(
  {
    deviceId: { type: String, index: true },
    code: { type: String },
    message: { type: String, required: true },
    detail: { type: mongoose.Schema.Types.Mixed },
    resolved: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model('Fault', faultSchema);
