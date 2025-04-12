import { disconnectDb } from "../db.js";
import { findAllCommunityBoundaries } from "../models/communityBoundary.js";

const communityBoundary  = await findAllCommunityBoundaries()
console.log(communityBoundary)

await disconnectDb()