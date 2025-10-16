// Utility to clear the database and let it recreate with the new version
async function clearDatabase() {
  try {
    // Delete the existing database
    const deleteReq = indexedDB.deleteDatabase('codemo-db');
    
    deleteReq.onsuccess = function() {
      console.log('Database deleted successfully');
      console.log('Please refresh the page to recreate the database with the new version');
    };
    
    deleteReq.onerror = function() {
      console.error('Error deleting database');
    };
    
    deleteReq.onblocked = function() {
      console.log('Database deletion blocked. Please close all tabs/windows using the app and try again.');
    };
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
clearDatabase().catch(console.error);