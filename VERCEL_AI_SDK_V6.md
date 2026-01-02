# Vercel AI SDK v6 - Complete Guide

## Table of Contents
1. [Overview](#overview)
2. [Installation](#installation)
3. [Providers](#providers)
4. [Tools](#tools)
5. [Agents](#agents)
6. [Loop Control](#loop-control)
7. [Streaming](#streaming)
8. [Structured Outputs](#structured-outputs)
9. [Migration from v5](#migration-from-v5)

## Overview

Vercel AI SDK v6 is a comprehensive TypeScript toolkit for building AI-powered applications and agents. It provides a unified API across multiple AI providers, advanced agent control mechanisms, and powerful tooling capabilities.

### Key Features
- **Unified Provider Architecture**: Single API for multiple AI providers
- **Agentic Loop Control**: Precise control over agent execution flow
- **Dynamic Tooling**: Runtime-defined tools with type safety
- **Streaming Support**: Real-time text and structured data streaming
- **Structured Outputs**: Type-safe JSON generation with Zod schemas
- **Framework Integration**: Works with React, Next.js, Vue, Svelte, and Node.js

## Installation

```bash
npm install ai @ai-sdk/google @ai-sdk/openai @ai-sdk/anthropic
```

For specific providers:
```bash
npm install @ai-sdk/google    # Google Gemini
npm install @ai-sdk/openai    # OpenAI
npm install @ai-sdk/anthropic # Anthropic Claude
```

## Providers

### AI Gateway Provider

The AI Gateway provides unified access to models from multiple providers without installing additional modules.

**Features:**
- Access models from OpenAI, Anthropic, Google, Meta, xAI, and others
- Consistent code structure across providers
- Easy model switching
- Automatic authentication on Vercel
- Pricing information and observability

**Usage:**

```typescript
import { generateText } from 'ai';

// Using model string (automatically uses AI Gateway)
const { text } = await generateText({
  model: 'openai/gpt-5',
  prompt: 'Hello world',
});

// Using gateway provider instance
import { gateway } from 'ai';

const { text } = await generateText({
  model: gateway('openai/gpt-5'),
  prompt: 'Hello world',
});
```

### Google Provider

```typescript
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const { text } = await generateText({
  model: google('gemini-2.5-flash'),
  prompt: 'What is an agent?',
});
```

### OpenAI Provider

```typescript
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

const { text } = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Explain AI agents',
});
```

### Anthropic Provider

```typescript
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

const { text } = await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  prompt: 'Describe the future of AI',
});
```

## Tools

### Basic Tool Definition

Tools in v6 use `inputSchema` (not `parameters`) and support Zod schemas directly.

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const weatherTool = tool({
  name: 'getWeather',
  description: 'Fetches weather information for a given location',
  inputSchema: z.object({
    location: z.string().describe('The location to get the weather for'),
    unit: z.enum(['celsius', 'fahrenheit']).optional().describe('Temperature unit'),
  }),
  execute: async ({ location, unit = 'celsius' }) => {
    // Fetch weather data
    const weather = await fetchWeatherAPI(location);
    return {
      temperature: unit === 'celsius' ? weather.tempC : weather.tempF,
      condition: weather.condition,
      humidity: weather.humidity,
    };
  },
});
```

### Tool with Output Schema

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const createEntryTool = tool({
  name: 'create_entry',
  description: 'Create a financial entry',
  inputSchema: z.object({
    entryType: z.enum(['Expense', 'Income']).describe('Whether the entry is an expense or income'),
    amount: z.number().gt(0).describe('The absolute amount of the entry'),
    category: z.string().describe('Category of the entry'),
    description: z.string().describe('Short note describing the entry'),
  }),
  execute: async (input) => {
    // Create entry logic
    const entry = await db.insert(entries).values(input).returning();
    return {
      id: entry[0].id,
      ...entry[0],
      createdAt: entry[0].createdAt.toISOString(),
    };
  },
});
```

### Using Tools with generateText

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'What is the weather in San Francisco?',
  tools: {
    getWeather: weatherTool,
    createEntry: createEntryTool,
  },
  maxSteps: 5, // Maximum tool-calling steps
});

// Access tool results
for (const step of result.steps) {
  if (step.toolCalls) {
    for (const toolCall of step.toolCalls) {
      console.log(`Tool: ${toolCall.toolName}`);
      console.log(`Result:`, toolCall.result);
    }
  }
}
```

### Tool Choice

Control which tools the model can use:

```typescript
const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Get the weather',
  tools: {
    getWeather: weatherTool,
    createEntry: createEntryTool,
  },
  toolChoice: {
    type: 'tool',
    toolName: 'getWeather', // Force specific tool
  },
});

// Or allow any tool
toolChoice: 'auto', // or 'required' or 'none'
```

## Agents

### ToolLoopAgent

The `ToolLoopAgent` class provides a high-level abstraction for building agents with tool-calling capabilities.

```typescript
import { ToolLoopAgent } from 'ai';
import { openai } from '@ai-sdk/openai';
import { stepCountIs } from 'ai';

const agent = new ToolLoopAgent({
  model: openai('gpt-4o'),
  system: 'You are a helpful assistant with access to tools.',
  tools: {
    getWeather: weatherTool,
    createEntry: createEntryTool,
  },
  stopWhen: stepCountIs(10), // Stop after 10 steps
});

const result = await agent.generate({
  prompt: 'What is the weather in NYC and create an entry for it?',
});

console.log(result.text); // Final answer
console.log(result.steps); // All steps taken
```

### Experimental Agent Class

The `Agent` class (currently experimental) provides an object-oriented approach:

```typescript
import { Experimental_Agent as Agent } from 'ai';
import { openai } from '@ai-sdk/openai';
import { stepCountIs } from 'ai';

const codingAgent = new Agent({
  model: openai('gpt-4o'),
  system: 'You are a coding agent specializing in Next.js and TypeScript.',
  stopWhen: stepCountIs(10),
  tools: {
    // Define tools here
  },
});

const result = await codingAgent.generate({
  prompt: 'Build an AI coding agent.',
});
```

## Loop Control

### stopWhen

Control when the tool-calling loop should stop.

```typescript
import { generateText, stepCountIs, hasToolCall } from 'ai';

// Stop after N steps
const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Complete this task',
  tools: { /* ... */ },
  stopWhen: stepCountIs(5), // Stop after 5 steps
});

// Stop when a specific tool is called
const result2 = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Complete this task',
  tools: {
    finalAnswer: finalAnswerTool,
    // ... other tools
  },
  stopWhen: hasToolCall('finalAnswer'), // Stop when finalAnswer is called
});

// Stop when model generates text (not a tool call)
const result3 = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Complete this task',
  tools: { /* ... */ },
  stopWhen: ({ steps }) => 
    steps.some(step => step.finishReason === 'stop'),
});
```

### prepareStep

Dynamically adjust parameters for each step in the loop.

```typescript
import { generateText } from 'ai';

const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Build an AI coding agent',
  tools: { /* ... */ },
  prepareStep: async ({ stepNumber, messages }) => {
    // Use cheaper model for first step
    if (stepNumber === 0) {
      return {
        model: openai('gpt-4o-mini'),
        toolChoice: {
          type: 'tool',
          toolName: 'analyzeIntent',
        },
      };
    }
    
    // Trim messages if too long
    if (messages.length > 20) {
      return {
        messages: [
          messages[0], // Keep system message
          ...messages.slice(-18), // Keep last 18 messages
        ],
      };
    }
    
    // Use more powerful model for complex steps
    if (stepNumber > 5) {
      return {
        model: openai('gpt-4o'),
      };
    }
    
    return {}; // No changes
  },
});
```

### Combining stopWhen and prepareStep

```typescript
const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Complete this multi-step task',
  tools: {
    research: researchTool,
    analyze: analyzeTool,
    finalize: finalizeTool,
  },
  stopWhen: [
    stepCountIs(10), // Maximum 10 steps
    ({ steps }) => steps.some(step => 
      step.toolCalls?.some(call => call.toolName === 'finalize')
    ), // Stop when finalize is called
  ],
  prepareStep: ({ stepNumber, messages }) => {
    // Adjust strategy based on step
    if (stepNumber === 0) {
      return { toolChoice: 'required' }; // Force tool use
    }
    return {};
  },
});
```

## Streaming

### Text Streaming

```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

const stream = await streamText({
  model: openai('gpt-4o'),
  prompt: 'Tell me a story about AI agents',
  tools: {
    getWeather: weatherTool,
  },
});

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}

// Access full text when done
const { text } = await stream;
console.log(text);
```

### Tool Call Streaming

```typescript
const stream = await streamText({
  model: openai('gpt-4o'),
  prompt: 'What is the weather?',
  tools: {
    getWeather: weatherTool,
  },
});

for await (const chunk of stream.fullStream) {
  if (chunk.type === 'text-delta') {
    process.stdout.write(chunk.textDelta);
  } else if (chunk.type === 'tool-call') {
    console.log(`Calling tool: ${chunk.toolName}`);
  } else if (chunk.type === 'tool-result') {
    console.log(`Tool result:`, chunk.result);
  }
}
```

### Streaming with Agents

```typescript
const agent = new ToolLoopAgent({
  model: openai('gpt-4o'),
  tools: { /* ... */ },
  stopWhen: stepCountIs(10),
});

const stream = await agent.stream({
  prompt: 'Complete this task',
});

for await (const chunk of stream) {
  if (chunk.type === 'text-delta') {
    process.stdout.write(chunk.textDelta);
  } else if (chunk.type === 'step-finish') {
    console.log(`Step ${chunk.stepNumber} finished`);
  }
}
```

## Structured Outputs

### generateObject

Generate structured JSON output with Zod schemas.

```typescript
import { generateObject } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

const schema = z.object({
  recipe: z.object({
    name: z.string(),
    ingredients: z.array(z.object({
      name: z.string(),
      amount: z.string(),
    })),
    steps: z.array(z.string()),
  }),
});

const { object } = await generateObject({
  model: openai('gpt-4o'),
  schema,
  prompt: 'Generate a lasagna recipe',
});

console.log(object.recipe.name);
console.log(object.recipe.ingredients);
```

### streamObject

Stream structured objects as they're generated.

```typescript
import { streamObject } from 'ai';

const stream = await streamObject({
  model: openai('gpt-4o'),
  schema,
  prompt: 'Generate a recipe',
});

for await (const chunk of stream.partialObjectStream) {
  console.log(chunk); // Partial object updates
}

const { object } = await stream; // Final complete object
```

## Migration from v5

### Key Changes

1. **Tool API**: `parameters` → `inputSchema`
2. **Model Types**: `LanguageModelV2` → `LanguageModelV3` (some providers)
3. **Agent Classes**: New `ToolLoopAgent` and experimental `Agent` classes
4. **stopWhen**: Enhanced with more condition types
5. **prepareStep**: New parameter for dynamic step configuration

### Tool Migration Example

**v5:**
```typescript
const tool = {
  name: 'getWeather',
  description: 'Get weather',
  parameters: z.object({
    location: z.string(),
  }),
  execute: async ({ location }) => { /* ... */ },
};
```

**v6:**
```typescript
import { tool } from 'ai';

const weatherTool = tool({
  name: 'getWeather',
  description: 'Get weather',
  inputSchema: z.object({
    location: z.string(),
  }),
  execute: async ({ location }) => { /* ... */ },
});
```

### generateText Migration

**v5:**
```typescript
const result = await generateText({
  model: openai('gpt-4'),
  prompt: 'Hello',
  tools: { weather: weatherTool },
  maxSteps: 5,
});
```

**v6:**
```typescript
const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Hello',
  tools: { weather: weatherTool },
  stopWhen: stepCountIs(5), // Use stopWhen instead of maxSteps
});
```

## Best Practices

### 1. Error Handling

```typescript
try {
  const result = await generateText({
    model: openai('gpt-4o'),
    prompt: 'Complete task',
    tools: { /* ... */ },
  });
} catch (error) {
  if (error instanceof InvalidToolInputError) {
    console.error('Invalid tool input:', error.toolName, error.input);
  } else if (error instanceof NoSuchToolError) {
    console.error('Tool not found:', error.toolName);
  }
}
```

### 2. Tool Result Validation

```typescript
const tool = tool({
  name: 'getData',
  inputSchema: z.object({ id: z.string() }),
  execute: async ({ id }) => {
    const data = await fetchData(id);
    
    // Validate result before returning
    if (!data) {
      throw new Error(`Data not found for id: ${id}`);
    }
    
    return data;
  },
});
```

### 3. Message Trimming

```typescript
const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Long conversation',
  tools: { /* ... */ },
  prepareStep: ({ messages }) => {
    if (messages.length > 30) {
      return {
        messages: [
          messages[0], // System message
          ...messages.slice(-28), // Last 28 messages
        ],
      };
    }
    return {};
  },
});
```

### 4. Conditional Tool Usage

```typescript
const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Complete task',
  tools: {
    tool1: tool1,
    tool2: tool2,
  },
  prepareStep: ({ stepNumber }) => {
    // Only allow tool1 in first 3 steps
    if (stepNumber < 3) {
      return {
        tools: {
          tool1: tool1,
        },
      };
    }
    return {};
  },
});
```

## Resources

- [Official Documentation](https://v6.ai-sdk.dev/)
- [GitHub Repository](https://github.com/vercel/ai)
- [Migration Guide](https://v6.ai-sdk.dev/docs/migration)
- [Provider Documentation](https://v6.ai-sdk.dev/providers)

## Summary

Vercel AI SDK v6 provides:

- **Unified API** across multiple AI providers
- **Powerful tooling** with type-safe schemas
- **Advanced agent control** with `stopWhen` and `prepareStep`
- **Streaming support** for real-time interactions
- **Structured outputs** with Zod validation
- **Framework integration** for modern web apps

The SDK is designed to be modular, scalable, and easy to integrate into various applications while maintaining type safety and developer experience.
