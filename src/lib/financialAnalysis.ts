import { Annotation, StateGraph, START, END, messagesStateReducer } from '@langchain/langgraph';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { createAgent, tool } from 'langchain';
import { z } from 'zod';

const MODEL_NAME = 'gpt-4o';

const getCurrentDateTool = tool(
  async () =>
    `The current date is: ${new Date().toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })}`,
  {
    name: 'get_current_date',
    description: 'Returns the current date. Use this tool first for any time-based queries.',
    schema: z.object({}),
  }
);

const tavilySearchTool = tool(
  async ({ query }: { query: string }) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      throw new Error('TAVILY_API_KEY is not configured');
    }

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, query, max_results: 5 }),
    });

    if (!response.ok) {
      throw new Error(`Tavily search failed: ${response.statusText}`);
    }

    const data = await response.json();
    const results = (data.results ?? []) as Array<{ title: string; url: string; content: string }>;

    if (results.length === 0) {
      return 'No results found.';
    }

    return results.map((result) => `${result.title} (${result.url})\n${result.content}`).join('\n\n');
  },
  {
    name: 'tavily_search',
    description: 'Searches the web for current information and returns relevant results.',
    schema: z.object({ query: z.string().describe('The search query') }),
  }
);

const alphaVantageTool = tool(
  async ({ ticker }: { ticker: string }) => {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      throw new Error('ALPHA_VANTAGE_API_KEY is not configured');
    }

    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(
      ticker
    )}&apikey=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Alpha Vantage request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data['Error Message'] || data['Note'] || data['Information']) {
      return data['Error Message'] || data['Note'] || data['Information'];
    }

    const series = data['Time Series (Daily)'] as Record<string, Record<string, string>> | undefined;
    if (!series) {
      return 'No time series data found for that ticker.';
    }

    const recentDates = Object.keys(series).sort().reverse().slice(0, 7);
    const lines = recentDates.map((date) => {
      const day = series[date];
      return `${date}: open=${day['1. open']} high=${day['2. high']} low=${day['3. low']} close=${day['4. close']} volume=${day['5. volume']}`;
    });

    return lines.join('\n');
  },
  {
    name: 'alpha_vantage',
    description:
      'Gets financial information about stocks (daily open, high, low, close, volume). Input should be the stock ticker symbol.',
    schema: z.object({ ticker: z.string().describe('The stock ticker symbol, e.g. AAPL') }),
  }
);

const baseModel = () => new ChatOpenAI({ model: MODEL_NAME, temperature: 0 });

const webSearchAgent = createAgent({
  model: baseModel(),
  tools: [tavilySearchTool, getCurrentDateTool],
  systemPrompt:
    'You are a web search agent. Your role is to use web search tools to find information and return comprehensive answers to queries.',
});

const financialAgent = createAgent({
  model: baseModel(),
  tools: [alphaVantageTool, getCurrentDateTool],
  systemPrompt:
    'You are a financial analysis agent. Your role is to use the Alpha Vantage tool to gather financial data and ' +
    'provide concise, informative answers. Do not generate charts or plots. Only use the tools provided to you ' +
    'and return a clear, text-based analysis or result.',
});

const codeAgent = createAgent({
  model: baseModel(),
  tools: [],
  systemPrompt:
    'You are a visualization agent. Your role is to write Python code that creates visual representations of ' +
    'data. You do not have access to a code execution tool, so never claim to have run the code or produced an ' +
    'image. Do not perform any data analysis or gather information yourself. Your sole purpose is to take the ' +
    'given data and return the code for an appropriate visualization, without executing it.',
});

const MEMBERS = {
  WebSearchAgent: 'An agent that performs web searches to gather information',
  FinancialAgent: 'An agent that analyzes financial data using the Alpha Vantage tool to acquire stock market information',
  CodeAgent: 'An agent that writes Python visualization code. Use this to produce plots and tables as code',
} as const;

type MemberName = keyof typeof MEMBERS;

const ROUTE_OPTIONS = ['FINISH', 'WebSearchAgent', 'FinancialAgent', 'CodeAgent'] as const;

const RouteResponseSchema = z.object({
  next: z.enum(ROUTE_OPTIONS).describe('The next agent that should act, or FINISH if the task is complete'),
});

const membersDescription = Object.entries(MEMBERS)
  .map(([name, description]) => `- ${name}: ${description}`)
  .join('\n');

const supervisorSystemPrompt =
  'You are a highly efficient supervisor managing a collaborative conversation between specialized agents:\n' +
  `${membersDescription}\n` +
  'Your role is to:\n' +
  "1. Analyze the user's request and the ongoing conversation.\n" +
  '2. Determine which agent is best suited to handle the next task.\n' +
  '3. Ensure a logical flow of information and task execution.\n' +
  "4. Correctly detect task completion and respond with 'FINISH', especially once a clear answer has been given.\n" +
  '5. Facilitate seamless transitions between agents as needed.\n' +
  "6. Conclude the process by responding with 'FINISH' when all objectives are met. Remember, each agent has " +
  'unique capabilities, so choose wisely based on the current needs of the task.';

const supervisorPrompt = ChatPromptTemplate.fromMessages([
  ['system', supervisorSystemPrompt],
  new MessagesPlaceholder('messages'),
  ['system', `Based on the conversation, who should act next? Choose one of: ${ROUTE_OPTIONS.join(', ')}`],
]);

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  next: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => '',
  }),
});

type AgentStateType = typeof AgentState.State;

async function supervisorNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const structuredModel = baseModel().withStructuredOutput(RouteResponseSchema);
  const chain = supervisorPrompt.pipe(structuredModel);
  const response = await chain.invoke({ messages: state.messages });
  return { next: response.next };
}

function toAgentMessage(content: BaseMessage['content'], name: MemberName): AIMessage {
  return new AIMessage({ content, name });
}

async function webSearchNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const result = await webSearchAgent.invoke({ messages: state.messages });
  const lastMessage = result.messages[result.messages.length - 1];
  return { messages: [toAgentMessage(lastMessage.content, 'WebSearchAgent')] };
}

async function financialNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const result = await financialAgent.invoke({ messages: state.messages });
  const lastMessage = result.messages[result.messages.length - 1];
  return { messages: [toAgentMessage(lastMessage.content, 'FinancialAgent')] };
}

async function codeNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const result = await codeAgent.invoke({ messages: state.messages });
  const lastMessage = result.messages[result.messages.length - 1];
  return { messages: [toAgentMessage(lastMessage.content, 'CodeAgent')] };
}

const graph = new StateGraph(AgentState)
  .addNode('WebSearchAgent', webSearchNode)
  .addNode('FinancialAgent', financialNode)
  .addNode('CodeAgent', codeNode)
  .addNode('Supervisor', supervisorNode)
  .addEdge('WebSearchAgent', 'Supervisor')
  .addEdge('FinancialAgent', 'Supervisor')
  .addEdge('CodeAgent', 'Supervisor')
  .addConditionalEdges('Supervisor', (state) => state.next, {
    WebSearchAgent: 'WebSearchAgent',
    FinancialAgent: 'FinancialAgent',
    CodeAgent: 'CodeAgent',
    FINISH: END,
  })
  .addEdge(START, 'Supervisor')
  .compile();

const MAX_STEPS = 10;

export async function runFinancialAnalysis(query: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  if (!process.env.TAVILY_API_KEY) {
    throw new Error('TAVILY_API_KEY is not configured');
  }
  if (!process.env.ALPHA_VANTAGE_API_KEY) {
    throw new Error('ALPHA_VANTAGE_API_KEY is not configured');
  }

  const finalState = await graph.invoke(
    { messages: [new HumanMessage(query)] },
    { recursionLimit: MAX_STEPS * 2 + 1 }
  );

  const agentMessages = finalState.messages.filter(
    (message): message is AIMessage => message instanceof AIMessage && !!message.name
  );
  const lastAgentMessage = agentMessages[agentMessages.length - 1];

  if (!lastAgentMessage) {
    throw new Error('Financial analysis graph did not return a result');
  }

  return typeof lastAgentMessage.content === 'string'
    ? lastAgentMessage.content
    : JSON.stringify(lastAgentMessage.content);
}
