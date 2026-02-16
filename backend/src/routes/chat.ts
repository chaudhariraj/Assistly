import { Router, Request, Response } from 'express';
import { ChatGroq } from '@langchain/groq';
import { MemorySaver, MessagesAnnotation, StateGraph, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { z } from 'zod';
import { createUserTools } from '../services/createUserTools';
import { scheduleMeetingTool } from '../services/scheduleMeetingTool';

const router = Router();

// Validation schemas
const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  threadId: z.string().optional().default('default')
});

// Store checkpointer and graphs per user
const userCheckpointers = new Map<string, MemorySaver>();
const userGraphs = new Map<string, any>();

function getUserGraph(userTokens: { access_token: string; refresh_token?: string; expiry_date?: number }) {
  const userId = userTokens.access_token.substring(0, 20); // Use part of token as user ID
  
  if (userGraphs.has(userId)) {
    return userGraphs.get(userId);
  }

  // Create user-specific tools
  const userTools = createUserTools(userTokens);
  const tools = [
    userTools.getCalenderEventsTool,
    userTools.getContactTool,
    userTools.smartCreateEventTool,
    userTools.smartUpdateEventTool,
    userTools.deleteCalendarEventsTool,
    userTools.createContactTool,
    userTools.updateContactTool,
    userTools.deleteContactTool,
    scheduleMeetingTool
  ];

  // Initialize model with user tools
  const model = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0,
    apiKey: process.env.GROQ_API_KEY
  }).bindTools(tools);

  // Build the graph
  async function callModel(state: typeof MessagesAnnotation.State) {
    const response = await model.invoke(state.messages);
    return { messages: [response] };
  }

  const toolNode = new ToolNode(tools);

  function shouldContinue(state: typeof MessagesAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage.tool_calls?.length) {
      return 'tools';
    }
    return '__end__';
  }

  const graph = new StateGraph(MessagesAnnotation)
    .addNode("llm", callModel)
    .addNode("tools", toolNode)
    .addEdge("__start__", "llm")
    .addEdge("tools", "llm")
    .addConditionalEdges("llm", shouldContinue, {
      __end__: END,
      tools: 'tools',
    });

  const checkpointer = new MemorySaver();
  const app = graph.compile({ checkpointer });

  userGraphs.set(userId, app);
  return app;
}

// Chat endpoint
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please connect your Google account.'
      });
    }

    const { message, threadId } = chatRequestSchema.parse(req.body);
    const userId = req.user.email || 'anonymous';

    const currentDateTime = new Date().toLocaleString('sv-SE').replace(' ', 'T');
    const timeZoneString = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Use user-specific thread ID
    const userThreadId = `${userId}-${threadId}`;

    // Get or create user-specific graph
    const app = getUserGraph(req.user.tokens);

    // Get existing conversation history from the thread
    const config = { configurable: { thread_id: userThreadId } };
    
    // Build messages array with system message and user message
    const messages = [
      {
        role: 'system' as const,
        content: `You are a smart personal assistant named Assistly.
        Current datetime: ${currentDateTime}
        Current timezone string: ${timeZoneString}
        User: ${req.user.name} (${req.user.email})
        
        You can help users:
        - Schedule meetings and manage calendar events
        - Create, update, and delete contacts
        - Check for upcoming meetings
        - Answer questions about their schedule
        
        IMPORTANT INSTRUCTIONS:
        - When asked about meetings, always check the calendar first using the get-events tool
        - When asked about contacts, use the get-contact tool to search for them
        - When providing contact information, ALWAYS include ALL available details (name, email, phone) if they exist
        - If a contact is found but email is missing, explicitly state that the contact exists but no email is available
        - Remember previous messages in this conversation to maintain context
        - Be thorough and provide complete information when available`,
      },
      {
        role: 'user' as const,
        content: message,
      },
    ];

    const result = await app.invoke(
      { messages },
      config
    );

    const finalMessage = result.messages[result.messages.length - 1];
    
    res.json({
      success: true,
      response: finalMessage?.content,
      threadId: userThreadId
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message'
    });
  }
});

export { router as chatRoutes };
