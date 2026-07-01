import mongoose from 'mongoose';

const presetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    weight: { type: Number, default: 0 },
    precondition: { type: String },
    configurations: [
      {
        type: { type: String, enum: ['value', 'delete_object', 'add_object'], default: 'value' },
        path: { type: String, required: true },
        value: { type: mongoose.Schema.Types.Mixed },
      },
    ],
    tags: [{ type: String }],
    isEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model('Preset', presetSchema);
