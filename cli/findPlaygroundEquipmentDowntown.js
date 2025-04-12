import { disconnectDb } from "../db.js";
import { findPlaygroundEquipmentInBoundingBox } from "../models/playgroundEquipment.js";

// downtown
// 51.05684240622569, 
// -114.04149878161581, 
// 51.03751197052317, 
// -114.09853706337815

const equipment = await findPlaygroundEquipmentInBoundingBox(
    51.05684240622569, 
    -114.04149878161581, 
    51.03751197052317, 
    -114.09853706337815
)
for (const piece of equipment) {
    console.log(piece.description, ':', piece.location.coordinates)
}
console.log('Found', equipment.length,'pieces of equipment')

await disconnectDb()
