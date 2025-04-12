import { disconnectDb } from "../db.js";
import { findAllTransitRoutes } from "../models/transitRoutes.js";

const transitRoutes  = await findAllTransitRoutes()
console.log(transitRoutes)

await disconnectDb()