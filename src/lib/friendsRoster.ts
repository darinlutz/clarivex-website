import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

export type Friend = {
  id: string;
  name: string;
  country: string;
};

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_PATH = path.join(DATA_DIR, 'friends.json');

export async function readFriends(): Promise<Friend[]> {
  try {
    const contents = await readFile(DATA_PATH, 'utf-8');
    return JSON.parse(contents) as Friend[];
  } catch {
    return [];
  }
}

async function writeFriends(friends: Friend[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(friends, null, 2), 'utf-8');
}

export async function addFriend(name: string, country: string): Promise<Friend> {
  const friends = await readFriends();
  const friend: Friend = { id: randomUUID(), name, country };
  friends.push(friend);
  await writeFriends(friends);
  return friend;
}

export async function deleteFriend(id: string): Promise<void> {
  const friends = await readFriends();
  await writeFriends(friends.filter((friend) => friend.id !== id));
}
