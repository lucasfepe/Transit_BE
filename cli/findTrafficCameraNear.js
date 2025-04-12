import { findCameraLocationNear } from "../models/trafficCamera.js"
import { disconnectDb } from "../db.js"

if (process.argv.length < 5) {
    console.log("Usage: findCameraLocationNear <lat> <lon> <distance (m)>")
    process.exit()
}

const lat = Number.parseFloat(process.argv[2])
const lon = Number.parseFloat(process.argv[3])
const distanceM = Number.parseFloat(process.argv[4])

const cameras = await findCameraLocationNear(lat, lon, distanceM)
for (const camera of cameras) {
    console.log(camera.cameraName, ':', camera.point.coordinates)
}
console.log('Found', cameras.length,'pieces of equipment')

await disconnectDb()