import { disconnectDb } from "../db.js";
import { findParkingZoneInBoundingBox } from "../models/parkingZone.js";

// downtown
// 51.05684240622569, 
// -114.04149878161581, 
// 51.03751197052317, 
// -114.09853706337815

const zone = await findParkingZoneInBoundingBox(
    51.05684240622569, 
    -114.04149878161581, 
    51.03751197052317, 
    -114.09853706337815
)
for (const piece of zone) {
    console.log(piece.addressDesc, ':', piece.line.coordinates)
}
console.log('Found', zone.length,'pieces of equipment')

await disconnectDb()
