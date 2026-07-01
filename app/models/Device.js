import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true, index: true },
    serialNumber: { type: String, index: true },
    oui: { type: String },
    productClass: { type: String },
    manufacturer: { type: String },
    model: { type: String },
    softwareVersion: { type: String },
    hardwareVersion: { type: String },
    ipAddress: { type: String },
    tags: [{ type: String }],
    parameters: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    lastInform: { type: Date },
    lastBoot: { type: Date },
    isOnline: { type: Boolean, default: false },
    connectionRequestUrl: { type: String },
    lastConnectionRequestAt: { type: Date },
    events: [{ type: String }],
    source: { type: String, enum: ['myacs', 'genieacs'], default: 'myacs' },
  },
  { timestamps: true },
);

deviceSchema.index({ lastInform: -1 });
deviceSchema.index({ tags: 1 });

export default mongoose.model('Device', deviceSchema);
