import { disconnectDb } from "../db.js";
import { findAllPlaygroundEquipment } from "../models/playgroundEquipment.js";

const playgroundEquipment  = await findAllPlaygroundEquipment()
console.log(playgroundEquipment)

await disconnectDb()