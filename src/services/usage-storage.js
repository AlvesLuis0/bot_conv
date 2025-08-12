import fs from 'fs';
import path from 'path';

export class UsageStorage {
  constructor(file) {
    this.data = new Map();
    this.path = path.join(process.cwd(), 'data', file);
  }

  setUsage(user, conv) {
    const usage = this.data.get(conv || {});
    usage.username = user.name;
    usage.userId = user.id;
    usage.timestamp = Date.now()
    this.data.set(conv, usage);
  }

  removeUsage(conv) {
    this.data.delete(conv);
  }

  async save() {
    const dataDir = path.dirname(this.path);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const dataToSave = Object.fromEntries(this.data);
    fs.writeFileSync(this.path, JSON.stringify(dataToSave, null, 2));
  }

  load() {
    if (fs.existsSync(this.path)) {
      const parsedData = JSON.parse(fs.readFileSync(this.path, 'utf8'));
      
      this.data.clear();

      for (const [key, value] of Object.entries(parsedData)) {
        this.data.set(Number(key), value);
      }
    }
  }
}