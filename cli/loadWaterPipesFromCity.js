import { disconnectDb } from "../db.js"
import { createWaterPipe, findWaterPipeByWaterServiceAddress } from "../models/waterPipe.js";

const response = await fetch('https://data.calgary.ca/resource/ta76-7bfx.json?$limit=500')

if (!response.ok) {
    console.log('Problem getting data from the city', response)
    process.exit()
}

const line = await response.json();
for (const pipe of line) {
    const { line, water_service_address } = pipe;

    const existingline = await findWaterPipeByWaterServiceAddress(water_service_address);
    if (existingline) {
        console.log('Updating', buildiwater_service_addressng_type);
        existingline.water_service_address = water_service_address;
        existingline.line=line;
        await existingline.save();
    } else {
        console.log('Creating', water_service_address, 'of', line);
        await createWaterPipe( water_service_address, line);
    }
}
await disconnectDb()