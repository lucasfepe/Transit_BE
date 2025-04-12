import { findCommunityBoundaryByCommCode } from "../models/communityBoundary.js";
import { disconnectDb } from "../db.js";
import { findPlaygroundEquipmentInArea } from "../models/playgroundEquipment.js";

const community = await findCommunityBoundaryByCommCode("BLN")

const equipment = await findPlaygroundEquipmentInArea(community.boundary)
for (const piece of equipment) {
    console.log(piece.description, ':', piece.location.coordinates)
}
console.log('Found', equipment.length,'pieces of equipment')

await disconnectDb()
