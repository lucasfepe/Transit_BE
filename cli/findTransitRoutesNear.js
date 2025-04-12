import { findTransitRoutesNear } from "../models/transitRoutes.js"
import { disconnectDb } from "../db.js"

if (process.argv.length < 5) {
    console.log("Usage: findTransitRoutesNear <lat> <lon> <distance (m)>")
    process.exit()
}

const lat = Number.parseFloat(process.argv[2])
const lon = Number.parseFloat(process.argv[3])
const distanceM = Number.parseFloat(process.argv[4])

const transitRoutes = await findTransitRoutesNear(lat, lon, distanceM)
for (const route of transitRoutes) {
    console.log(route.route_short_name, ':', route.shape.coordinates)
}
console.log('Found', transitRoutes.length,'routes')

await disconnectDb()