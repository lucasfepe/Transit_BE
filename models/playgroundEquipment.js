import { connectDb } from "../db.js";

const mongoose = await connectDb();

// Schema 
const playgroundEquipmentSchema = new mongoose.Schema({
    city_asset_cd: String,
    description: String,
    location: {
        type: { 
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    }
})
playgroundEquipmentSchema.index({ location: '2dsphere' }) 

// Models
const PlaygroundEquipment = mongoose.model('playgroundEquipment', playgroundEquipmentSchema, 'playgroundEquipment')

// Functions to expose to the outside world!
export async function createPlaygroundEquipment(city_asset_cd, description, location) {
    const newPlaygroundEquipment = await PlaygroundEquipment.create({
        city_asset_cd,
        description,
        location
    })    
    return newPlaygroundEquipment
}

export async function findAllPlaygroundEquipment() {
    const playgroundEquipment = await PlaygroundEquipment.find()
    return playgroundEquipment
}

export async function findPlaygroundEquipmentById(id) {
    const playgroundEquipment = await PlaygroundEquipment.findById(id)
    return playgroundEquipment
}

export async function findPlaygroundEquipmentByCityAssetCd(asset_cd) {
    const playgroundEquipment = await PlaygroundEquipment.findOne({ city_asset_cd: asset_cd })
    return playgroundEquipment
}

// In 1791, the metre was defined as 1 ten millionth the distance
// between the north pole and the equator travelling through Paris. 
// 234 years later, Tony used this formula in a sofware development
// class focused on geographic queries.
const METERS_PER_DEGREE = 10000000/90 

export async function findPlaygroundEquipmentNear(lat, lon, distanceM) {
    const distanceDegrees = distanceM / METERS_PER_DEGREE    
    const equipment = await PlaygroundEquipment.find()
        .where('location')
        .within()
        .circle({ center: [lon, lat], radius: distanceDegrees})
    return equipment
}

export async function findPlaygroundEquipmentInBoundingBox(northLat, eastLon, southLat, westLon) {
    const equipment = await PlaygroundEquipment.find()
        .where('location')
        .within({ box: [[eastLon, northLat],[westLon, southLat]] })
    return equipment
}

export async function findPlaygroundEquipmentInArea(searchArea) {
    const equipment = await PlaygroundEquipment.find()
        .where('location')
        .within(searchArea)
    return equipment
}