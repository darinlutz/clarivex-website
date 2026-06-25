import { NextResponse } from 'next/server';
import { chatWithFriend, ChatMessage } from '@/lib/friend';
import { Difficulty } from '@/lib/language';
import { Language } from '@/lib/translate';

interface FriendRequest {
  history: ChatMessage[];
  difficulty?: Difficulty;
  language?: Language;
}

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const VALID_LANGUAGES: Language[] = ['Arabic', 'English', 'German', 'Japanese', 'Vietnamese'];

export async function POST(request: Request) {
  try {
    const body: FriendRequest = await request.json();

    if (!Array.isArray(body.history)) {
      return NextResponse.json({ error: 'Missing conversation history' }, { status: 400 });
    }

    const difficulty: Difficulty = VALID_DIFFICULTIES.includes(body.difficulty as Difficulty)
      ? (body.difficulty as Difficulty)
      : 'medium';

    const language: Language = VALID_LANGUAGES.includes(body.language as Language)
      ? (body.language as Language)
      : 'Vietnamese';

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const reply = await chatWithFriend(body.history, difficulty, language);

    return NextResponse.json({ success: true, reply }, { status: 200 });
  } catch (error) {
    console.error('Friend chat error:', error);

    return NextResponse.json(
      { error: 'Failed to get a reply' },
      { status: 500 }
    );
  }
}
