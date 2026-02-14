/**
 * Simple test of Claude Agent SDK
 */

import { query } from '@anthropic-ai/claude-agent-sdk';

async function main() {
  console.log('Testing Claude Agent SDK...');
  console.log('Environment:');
  console.log('  CLAUDE_CODE_USE_BEDROCK:', process.env.CLAUDE_CODE_USE_BEDROCK);
  console.log('  AWS_REGION:', process.env.AWS_REGION);
  console.log('  AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'set' : 'not set');
  console.log('');

  try {
    console.log('Calling Claude Agent SDK...');

    for await (const message of query({
      prompt: 'Say "Hello from Claude Agent SDK!"',
      options: {
        allowedTools: [],
        permissionMode: 'bypassPermissions',
      },
    })) {
      console.log('Message:', JSON.stringify(message, null, 2));

      if ('result' in message) {
        console.log('\nFinal result:', message.result);
      }
    }

    console.log('\n✓ Test successful!');
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  }
}

main();
