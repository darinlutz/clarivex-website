import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';

const PROMPT_TEMPLATE = ChatPromptTemplate.fromMessages([
  [
    'system',
    'You are a sim racing driving coach. The user will give you a focus-area comparison of two laps ' +
      'of {track}: a Base lap and a Compare lap. Each focus area lists the time through the area for ' +
      'both laps with the difference (Compare minus Base; negative means the Compare lap was faster), ' +
      'where each lap first touched the brake in feet from the start/finish line (later or earlier ' +
      'for the Compare lap), and the peak brake pressure for each lap (heavier or lighter for the ' +
      'Compare lap), and the speed at the end of the area (exit speed, in mph) for each lap. Write a summary of exactly 6 or 7 sentences from the perspective of the Compare ' +
      'lap that answers: where on the track, and how, could the Compare lap be better? Name the ' +
      'specific focus areas where the Compare lap lost the most time, use the numbers from the data, ' +
      'and give concrete advice based on the brakepoint, brake pressure and exit speed differences. Briefly note ' +
      'where the Compare lap was already stronger. Write plain prose in a single paragraph with no ' +
      'headings, lists, or markdown, and do not invent data that is not in the comparison.',
  ],
  ['user', '{comparison}'],
]);

// Coaching summary of a Lap Compare result, written for the Compare lap
export async function summarizeLapComparison(comparison: string, track: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const model = new ChatOpenAI({ model: 'gpt-4o', temperature: 0.3 });
  const chain = PROMPT_TEMPLATE.pipe(model);
  const response = await chain.invoke({ comparison, track });
  return typeof response.content === 'string' ? response.content.trim() : '';
}
