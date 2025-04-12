import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loaderFiles = [
    'loadCameraLocationFromCity.js',
    'loadCommunityBoundaryFromCity.js',
    'loadParkingZoneFromCity.js',
    'loadPlaygroundEquipmentFromCity.js',
    'loadTransitRoutesFromCity.js',
    'loadWaterPipesFromCity.js'
];

async function runLoader(file) {
    console.log(`Running ${file}...`);
    try {
        const { stdout, stderr } = await execAsync(`node ${file}`, { cwd: __dirname });
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
    } catch (error) {
        console.error(`Error running ${file}:`, error);
    }
    console.log(`Finished ${file}\n`);
}

// Run loaders sequentially
async function runAllLoaders() {
    for (const file of loaderFiles) {
        await runLoader(file);
    }
}

console.log('Starting data load from City of Calgary...');
await runAllLoaders();
console.log('All data loads completed!');