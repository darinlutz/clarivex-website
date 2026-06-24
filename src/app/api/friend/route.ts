import { NextResponse } from 'next/server';
import { chatWithFriend, ChatMessage } from '@/lib/friend';
import { Difficulty } from '@/lib/language';

interface FriendRequest {
  history: ChatMessage[];
  difficulty?: Difficulty;
}

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export async function POST(request: Request) {
  try {
    const body: FriendRequest = await request.json();

    if (!Array.isArray(body.history)) {
      return NextResponse.json({ error: 'Missing conversation history' }, { status: 400 });
    }

    const difficulty: Difficulty = VALID_DIFFICULTIES.includes(body.difficulty as Difficulty)
      ? (body.difficulty as Difficulty)
      : 'medium';

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const reply = await chatWithFriend(body.history, difficulty);

    return NextResponse.json({ success: true, reply }, { status: 200 });
  } catch (error) {
    console.error('Friend chat error:', error);

    return NextResponse.json(
      { error: 'Failed to get a reply' },
      { status: 500 }
    );
  }
}
