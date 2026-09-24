import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';

const TripPlannerState = Annotation.Root({
  destination: Annotation<string>,
  preferences: Annotation<string>,
  result: Annotation<string>,
});

type TripPlannerStateType = typeof TripPlannerState.State;

const promptTemplate = ChatPromptTemplate.fromMessages([
  [
    'system',
    'You are a trip planner expert. Help me plan a trip to {destination}.\n' +
      'My selected preferences are: {preferences}. Focus your recommendations on those preferences.\n' +
      'For EVERY place you recommend, give its approximate distance from the reference location, in both miles ' +
      'and kilometres (for example "about 1.2 mi / 1.9 km away"). The reference location is the exact point given ' +
      'if {destination} is a latitude/longitude pair; otherwise it is the center of the city named in ' +
      '{destination} (its main downtown / city-center point). State the reference location once at the top, and ' +
      'note that distances are approximate straight-line estimates.',
  ],
  ['user', 'What should I do in {destination}?'],
]);

async function planTripNode(state: TripPlannerStateType): Promise<Partial<TripPlannerStateType>> {
  const model = new ChatOpenAI({ model: 'gpt-4o' });
  const chain = promptTemplate.pipe(model);

  const response = await chain.invoke({
    destination: state.destination,
    preferences: state.preferences,
  });

  const result = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  return { result };
}

// Single node today (planTrip); future steps (e.g. search activities, check
// weather) can be added as additional nodes/edges in this graph without
// changing the public planTrip() interface below.
const graph = new StateGraph(TripPlannerState)
  .addNode('planTrip', planTripNode)
  .addEdge(START, 'planTrip')
  .addEdge('planTrip', END)
  .compile();

export async function planTrip(destination: string, preferences: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const finalState = await graph.invoke({ destination, preferences });

  if (!finalState.result) {
    throw new Error('Trip planner graph did not return a result');
  }

  return finalState.result;
}
