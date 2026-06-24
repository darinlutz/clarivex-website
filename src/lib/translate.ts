import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

export type TranslationDirection = 'vi-to-en' | 'en-to-vi';

const TranslationSchema = z.object({
  translation: z.string().describe('The translated text'),
});

const PROMPT_TEMPLATES: Record<TranslationDirection, ChatPromptTemplate> = {
  'vi-to-en': ChatPromptTemplate.fromMessages([
    [
      'system',
      'You are a Vietnamese-to-English translator. Translate the given Vietnamese text into ' +
        'natural, accurate English, preserving the original meaning and tone as closely as possible.',
    ],
    ['user', '{text}'],
  ]),
  'en-to-vi': ChatPromptTemplate.fromMessages([
    [
      'system',
      'You are an English-to-Vietnamese translator. Translate the given English text into ' +
        'natural, accurate Vietnamese with correct diacritics, preserving the original meaning ' +
        'and tone as closely as possible.',
    ],
    ['user', '{text}'],
  ]),
};

export async function translateText(
  text: string,
  direction: TranslationDirection
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const model = new ChatOpenAI({ model: 'gpt-4o', temperature: 0 });
  const structuredModel = model.withStructuredOutput(TranslationSchema);
  const chain = PROMPT_TEMPLATES[direction].pipe(structuredModel);

  const response = await chain.invoke({ text });
  return response.translation;
}
