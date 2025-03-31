/**
 * Database migration CLI tool
 */
const migrations = require('./src/config/migrations');

// Get command line arguments
const command = process.argv[2] || 'update';

(async () => {
  console.log(`Starting migration with command: ${command}`);
  
  let success = false;
  
  switch (command) {
    case 'init':
      console.log('Initializing database (WARNING: This will drop all tables)');
      success = await migrations.initializeDatabase();
      break;
    case 'update':
      console.log('Updating database schema');
      success = await migrations.updateSchema();
      break;
    case 'add-image-columns':
      console.log('Adding image columns to processed_invoices table');
      success = await migrations.addImageColumns();
      break;
    default:
      console.error('Unknown command. Use init, update, or add-image-columns');
      process.exit(1);
  }
  
  if (success) {
    console.log('Migration completed successfully');
    process.exit(0);
  } else {
    console.error('Migration failed');
    process.exit(1);
  }
})();
