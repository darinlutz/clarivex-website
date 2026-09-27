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
      'Compare lap), the minimum speed through the area (min speed, in mph) for each lap, and the speed at the end of the area (exit speed, in mph) for each lap. Write a summary of exactly 6 or 7 sentences from the perspective of the Compare ' +
      'lap that answers: where on the track, and how, could the Compare lap be better? Name the ' +
      'specific focus areas where the Compare lap lost the most time, use the numbers from the data, ' +
      'and give concrete advice based on the brakepoint, brake pressure, min speed and exit speed differences. Briefly note ' +
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

const STINT_PROMPT_TEMPLATE = ChatPromptTemplate.fromMessages([
  [
    'system',
    'You are a sim racing driving coach. The user will give you stint statistics from several laps of ' +
      '{track} by the same driver. It lists the lap times, then each focus area with the best, average ' +
      'and worst time through the area, the average time lost to the best, and the standard deviation ' +
      'of the time; plus the average and standard deviation of the brakepoint (feet from the start/finish ' +
      'line, with the target when there is one; more feet than the target means braking later than the ' +
      'target), the peak brake pressure (with the target when there is ' +
      'one), the minimum speed and the exit speed (mph). Focus areas are listed from most to least ' +
      'average time lost. Write an analysis in two short paragraphs of plain prose, 8 to 10 sentences in ' +
      'total. The first paragraph covers the biggest opportunities: which focus areas cost the most time ' +
      'on average and what to change there, comparing against the targets where given. The second ' +
      'covers consistency: which focus areas have the largest variation from lap to lap (time, ' +
      'brakepoint, brake pressure or speeds), what that variation suggests the driver is doing, and ' +
      'where the driver is already consistent. Use the numbers from the data, write to the driver as ' +
      '"you", use no headings, lists, or markdown, and do not invent data that is not in the statistics.',
  ],
  ['user', '{stats}'],
]);

// Opportunities and consistency analysis of a Stint Analysis result
export async function summarizeStint(stats: string, track: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const model = new ChatOpenAI({ model: 'gpt-4o', temperature: 0.3 });
  const chain = STINT_PROMPT_TEMPLATE.pipe(model);
  const response = await chain.invoke({ stats, track });
  return typeof response.content === 'string' ? response.content.trim() : '';
}
