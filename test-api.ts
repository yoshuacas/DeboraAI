/**
 * Simple script to test the /api/code/modify endpoint
 *
 * Usage:
 * npx ts-node test-api.ts "Your request here"
 */

const TEST_REQUEST = process.argv[2] || 'Add a comment at the top of src/app/page.tsx that says "// Hello from DeboraAI"';

async function testAPI() {
  console.log('Testing /api/code/modify endpoint...\n');
  console.log('Request:', TEST_REQUEST);
  console.log('='.repeat(80));

  try {
    const response = await fetch('http://localhost:3000/api/code/modify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: TEST_REQUEST,
        skipTests: true, // Skip tests for faster feedback during development
      }),
    });

    const data = await response.json();

    console.log('\nResponse Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✓ SUCCESS!');
      console.log('\nModifications:');
      data.data.modifications.forEach((mod: any) => {
        console.log(`  - ${mod.filePath}${mod.created ? ' (created)' : ''}`);
      });
      console.log('\nExplanation:', data.data.explanation);
      console.log('\nCommit:', data.data.commit.hash);
    } else {
      console.log('\n✗ FAILED');
      console.log('Error:', data.error);
      if (data.details) {
        console.log('Details:', data.details);
      }
    }
  } catch (error) {
    console.error('\n✗ Request failed:', error);
  }
}

testAPI();
