import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type WeightRecord = {
  weightLb: number;
  recordedAt: string;
};

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_PATH = path.join(DATA_DIR, 'weight.json');

export async function readLatestWeight(): Promise<WeightRecord | null> {
  try {
    const contents = await readFile(DATA_PATH, 'utf-8');
    return JSON.parse(contents) as WeightRecord;
  } catch {
    return null;
  }
}

export async function writeLatestWeight(record: WeightRecord): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(record, null, 2), 'utf-8');
}
