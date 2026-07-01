import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    method: {
      type: String,
      enum: [
        'GetParameterValues',
        'SetParameterValues',
        'GetParameterNames',
        'Reboot',
        'Download',
        'Upload',
        'FactoryReset',
        'AddObject',
        'DeleteObject',
      ],
      required: true,
    },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'fault', 'cancelled'],
      default: 'pending',
      index: true,
    },
    result: { type: mongoose.Schema.Types.Mixed },
    fault: { type: String },
    priority: { type: Number, default: 0 },
    retries: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

taskSchema.index({ createdAt: -1 });

export default mongoose.model('Task', taskSchema);
