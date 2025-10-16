// Clear the test provider
import { getAllCustomProviders, deleteCustomProvider } from '../local-db';

async function runTest() {
  console.log('Clearing test provider...\n');

  try {
    // Get all providers
    const providers = await getAllCustomProviders();
    console.log('All providers:');
    providers.forEach((provider: any) => {
      console.log(`- ${provider.name} (${provider.id})`);
      // Delete test providers
      if (provider.name === 'Test CRUD Provider') {
        deleteCustomProvider(provider.id);
        console.log(`  Deleted test provider: ${provider.id}`);
      }
    });
    
    console.log('\nExpected: Test provider should be deleted\n');
  } catch (error) {
    console.error('Error:', error);
  }

  console.log('Test provider cleanup completed.');
}

// Run the test
runTest().catch(console.error);