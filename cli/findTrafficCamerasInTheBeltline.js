import { findCommunityBoundaryByCommCode } from "../models/communityBoundary.js";
import { disconnectDb } from "../db.js";
import { findTrafficCameraInArea } from "../models/trafficCamera.js";

const community = await findCommunityBoundaryByCommCode("BLN")

const cameras = await findTrafficCameraInArea(community.boundary)
for (const camera of cameras) {
    console.log(camera.cameraName, ':', camera.point.coordinates)
}
console.log('Found', cameras.length,'pieces of cameras')

await disconnectDb()
