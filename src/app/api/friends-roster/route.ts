import { NextResponse } from 'next/server';
import { addFriend, deleteFriend, readFriends } from '@/lib/friendsRoster';
import { COUNTRIES } from '@/lib/countries';
import { getCurrentUser } from '@/lib/session';

// Each signed-in user has their own friends list.
const NOT_SIGNED_IN = { error: 'Log in to see your friends' };

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(NOT_SIGNED_IN, { status: 401 });
    }
    const friends = await readFriends(user.id);
    return NextResponse.json({ friends });
  } catch (error) {
    console.error('Read friends error:', error);
    return NextResponse.json({ error: 'Failed to load friends' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(NOT_SIGNED_IN, { status: 401 });
    }
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

    const friend = await addFriend(user.id, name, country);
    return NextResponse.json({ friend }, { status: 201 });
  } catch (error) {
    console.error('Add friend error:', error);
    return NextResponse.json({ error: 'Failed to add friend' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(NOT_SIGNED_IN, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await deleteFriend(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete friend error:', error);
    return NextResponse.json({ error: 'Failed to delete friend' }, { status: 500 });
  }
}
