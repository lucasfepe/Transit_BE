import { disconnectDb } from "../db.js";
import { findTrafficCamerasInBoundingBox } from "../models/trafficCamera.js";

// downtown
// 51.05684240622569, 
// -114.04149878161581, 
// 51.03751197052317, 
// -114.09853706337815

const cameras = await findTrafficCamerasInBoundingBox(
    51.05684240622569, 
    -114.04149878161581, 
    51.03751197052317, 
    -114.09853706337815
)
for (const camera of cameras) {
    console.log(camera.cameraName, ':', camera.point.coordinates)
}
console.log('Found', cameras.length,'pieces of equipment')

await disconnectDb()
