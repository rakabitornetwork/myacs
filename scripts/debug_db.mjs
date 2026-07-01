import mongoose from 'mongoose';

await mongoose.connect('mongodb://127.0.0.1:27017/myacs');

console.log('=== RECENT TASKS ===');
const tasks = await mongoose.connection.db.collection('tasks').find({}).sort({createdAt:-1}).limit(10).toArray();
for (const t of tasks) {
  console.log('[' + t.status + '] ' + t.method + ' device=' + t.deviceId + ' retries=' + t.retries + ' created=' + t.createdAt + ' updated=' + t.updatedAt);
  if (t.fault) console.log('  fault: ' + t.fault);
}

console.log('\n=== ALL DEVICES ===');
const devices = await mongoose.connection.db.collection('devices').find({}).toArray();
for (const d of devices) {
  console.log('deviceId=' + d.deviceId);
  console.log('  source=' + d.source);
  console.log('  online=' + d.isOnline);
  console.log('  connectionRequestUrl=' + (d.connectionRequestUrl || 'NONE'));
  console.log('  lastInform=' + d.lastInform);
  console.log('  events=' + JSON.stringify(d.events));
}

console.log('\n=== CWMP SESSIONS ===');
const sessions = await mongoose.connection.db.collection('cwmpsessions').find({}).toArray();
for (const s of sessions) {
  console.log('deviceId=' + s.deviceId + ' awaitingDispatch=' + s.awaitingDispatch + ' lastSeen=' + s.lastSeen + ' ip=' + s.ipAddress);
}

await mongoose.disconnect();
