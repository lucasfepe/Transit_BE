import { connectDb } from "../db.js";

const mongoose = await connectDb();

// Schema 
const waterPipeSchema = new mongoose.Schema({
    water_service_address: String,
   
    line: {
        type: {
            type: String,
            enum: ['MultiLineString'], // 'line.type' must be 'MultiLineString'
            required: true
        },
        coordinates: {
            type: [[[Number]]], // Array of arrays of arrays of numbers
            required: true
        }
    }
})

// Models
const WaterPipe = mongoose.model('waterPipe', waterPipeSchema, 'waterPipes')

// Functions to expose to the outside world!
export async function createWaterPipe(water_service_address, line) {
    const newWaterPipe = await WaterPipe.create({
        water_service_address,
        line,
    })    
    return newWaterPipe
}

export async function findAllWaterPipes() {
    const waterPipes = await WaterPipe.find()
    return waterPipes
}

export async function findWaterPipeById(id) {
    const waterPipe = await WaterPipe.findById(id)
    return waterPipe
}

export async function findWaterPipeByWaterServiceAddress(water_service_address) {
    const waterPipe = await WaterPipe.findOne({ water_service_address })
    return waterPipe
}

// In 1791, the metre was defined as 1 ten millionth the distance
// between the north pole and the equator travelling through Paris. 
// 234 years later, Tony used this formula in a sofware development
// class focused on geographic queries.
const METERS_PER_DEGREE = 10000000/90 

export async function findWaterPipeNear(lat, lon, distanceM) {
    return []
}
