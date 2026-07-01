import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String },
    size: { type: Number },
    type: { type: String, enum: ['firmware', 'config', 'other'], default: 'other' },
    url: { type: String },
    checksum: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model('AcsFile', fileSchema);
