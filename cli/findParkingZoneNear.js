import { findParkingZoneNear } from "../models/parkingZone.js"
import { disconnectDb } from "../db.js"

if (process.argv.length < 5) {
    console.log("Usage: findZoneNear <lat> <lon> <distance (m)>")
    process.exit()
}

const lat = Number.parseFloat(process.argv[2])
const lon = Number.parseFloat(process.argv[3])
const distanceM = Number.parseFloat(process.argv[4])

const zone = await findParkingZoneNear(lat, lon, distanceM)
for (const piece of zone) {
    console.log(piece.addressDesc, ':', piece.line.coordinates)
}
console.log('Found', zone.length,'pieces of zone')

await disconnectDb()