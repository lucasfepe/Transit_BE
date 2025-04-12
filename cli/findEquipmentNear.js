import { findPlaygroundEquipmentNear } from "../models/playgroundEquipment.js"
import { disconnectDb } from "../db.js"

if (process.argv.length < 5) {
    console.log("Usage: findEquipmentNear <lat> <lon> <distance (m)>")
    process.exit()
}

const lat = Number.parseFloat(process.argv[2])
const lon = Number.parseFloat(process.argv[3])
const distanceM = Number.parseFloat(process.argv[4])

const equipment = await findPlaygroundEquipmentNear(lat, lon, distanceM)
for (const piece of equipment) {
    console.log(piece.description, ':', piece.location.coordinates)
}
console.log('Found', equipment.length,'pieces of equipment')

await disconnectDb()