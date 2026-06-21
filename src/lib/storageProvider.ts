import fs from 'fs/promises';
import path from 'path';

export interface StorageProvider {
  upload(key: string, buffer: Buffer): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export class LocalDiskStorageProvider implements StorageProvider {
  private basePath: string;

  constructor() {
    this.basePath = path.join(process.cwd(), '.backups');
  }

  private async ensureDir() {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (e) {}
  }

  async upload(key: string, buffer: Buffer): Promise<string> {
    await this.ensureDir();
    const filePath = path.join(this.basePath, path.basename(key));
    await fs.writeFile(filePath, buffer);
    return path.basename(key);
  }

  async download(key: string): Promise<Buffer> {
    const filePath = path.join(this.basePath, path.basename(key));
    return await fs.readFile(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.basePath, path.basename(key));
    try {
      await fs.unlink(filePath);
    } catch (e) {}
  }

  async exists(key: string): Promise<boolean> {
    const filePath = path.join(this.basePath, path.basename(key));
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// Future implementations would export an S3StorageProvider here and switch based on BackupSetting.destination
export const getStorageProvider = (): StorageProvider => {
  return new LocalDiskStorageProvider();
};
