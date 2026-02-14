/**
 * Test script for Claude Code CLI integration
 */

import { ClaudeCodeClient } from './src/lib/agents/claude-code-client.js';

async function main() {
  console.log('Testing Claude Code CLI integration...\n');

  const client = new ClaudeCodeClient(process.cwd());

  try {
    console.log('1. Testing simple completion...');
    const response1 = await client.complete(
      'What is 2 + 2? Respond with just the number.'
    );

    console.log('Success:', response1.success);
    console.log('Content:', response1.content);
    console.log('Session ID:', response1.sessionId);
    console.log('');

    console.log('2. Testing with system prompt...');
    const response2 = await client.complete(
      'What color is the sky?',
      'You are a helpful assistant. Keep responses brief.'
    );

    console.log('Success:', response2.success);
    console.log('Content:', response2.content);
    console.log('');

    console.log('3. Testing connection...');
    const testResult = await client.testConnection();
    console.log('Connection test:', testResult);
    console.log('');

    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

main();
