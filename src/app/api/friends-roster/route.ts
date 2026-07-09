import { NextResponse } from 'next/server';
import { addFriend, deleteFriend, readFriends } from '@/lib/friendsRoster';
import { COUNTRIES } from '@/lib/countries';

export async function GET() {
  const friends = await readFriends();
  return NextResponse.json({ friends });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const country = typeof body.country === 'string' && COUNTRIES.includes(body.country as (typeof COUNTRIES)[number])
      ? body.country
      : '';
    if (!country) {
      return NextResponse.json({ error: 'Country is required' }, { status: 400 });
    }

    const friend = await addFriend(name, country);
    return NextResponse.json({ friend }, { status: 201 });
  } catch (error) {
    console.error('Add friend error:', error);
    return NextResponse.json({ error: 'Failed to add friend' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await deleteFriend(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete friend error:', error);
    return NextResponse.json({ error: 'Failed to delete friend' }, { status: 500 });
  }
}
