import { findpipeNear } from "../models/waterPipe.js"
import { disconnectDb } from "../db.js"


const lat = Number.parseFloat(process.argv[2]);
const lon = Number.parseFloat(process.argv[3]);
const distanceM = Number.parseFloat(process.argv[4]);

const waterserviceaddress = await findpipeNear(lat, lon, distanceM);
    for (const waterserviceaddress of pipes) {
console.log(waterserviceaddress, '.', lat, lon, distanceM)
}
console.log('found', waterserviceaddress.address, waterserviceaddress.distance, 'waterserviceaddress')


    await disconnectDb()


