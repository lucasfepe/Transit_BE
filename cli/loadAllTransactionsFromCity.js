// loadAllTransactionsFromCity.js
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import path from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const loaderFiles = [
    // 'loadTransitRoutesFromCity.js',
    'loadTransitScheduleFromCity.js',
];

async function runLoader(file) {
    console.log(`Running ${file}...`);
    try {
        
        console.log('Using database:', process.env.MONGODB_URI || 'local database');
        
        const { stdout, stderr } = await execAsync(`node ${file}`, { 
            cwd: __dirname,
            env: process.env  // Pass the environment to the child process
        });
        
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
    } catch (error) {
        console.error(`Error running ${file}:`, error);
    }
    console.log(`Finished ${file}\n`);
}

async function runAllLoaders() {
    try {
        for (const file of loaderFiles) {
            await runLoader(file);
        }
    } catch (error) {
        console.error('Error during data loading:', error);
    }
}

console.log('Starting data load from City of Calgary...');
console.log('Environment MONGODB_URI:', process.env.MONGODB_URI ? 'is set' : 'is not set');
await runAllLoaders();
console.log('All data loads completed!');