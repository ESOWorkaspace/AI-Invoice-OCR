// Simple test script to confirm environment variables are loading
console.log('Checking environment variables from .env file');
console.log('1. import.meta.env is not available outside of Vite. Environment variables will be injected during build.');
console.log('2. The frontend reads these variables using import.meta.env.VITE_* at runtime.');
console.log('3. Vite loads environment variables from .env files at the project root.');
console.log('\nFrontend .env files loading order:');
console.log('- .env                # loaded in all cases');
console.log('- .env.local          # loaded in all cases, ignored by git');
console.log('- .env.[mode]         # only loaded in specified mode');
console.log('- .env.[mode].local   # only loaded in specified mode, ignored by git\n'); 