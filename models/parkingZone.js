import { connectDb } from "../db.js";

const mongoose = await connectDb();

const parkingZoneSchema = new mongoose.Schema({
    globalid: String,
    addressDesc: String,
    line: {
        type: { 
            type: String,
            enum: ['MultiLineString'],
            required: true
        },
        coordinates: {
            type: [[[Number]]],
            required: true
        }
    }
})
parkingZoneSchema.index({ line: '2dsphere' }) 

//Model
const ParkingZone = mongoose.model('parkingZone', parkingZoneSchema, "parkingZones")

//export default function createParkingZones
export async function createParkingZone(globalid,addressDesc,line) {
    const newParkingZone = await ParkingZone.create({
        globalid,
        addressDesc,
        line
    })    
    return newParkingZone
}


export async function findAllParkingZone() {
    const parkingZone = await ParkingZone.find()
    return parkingZone
}

export async function findParkingZoneById(id) {
    const parkingZone = await ParkingZone.findById(id)
    return parkingZone
}

export async function findParkingZoneByGlobalGuid(globalId) {
    const parkingZone = await ParkingZone.findOne({ globalid_guid: globalId })
    return parkingZone
}

const METERS_PER_DEGREE = 10000000/90 

export async function findParkingZoneNear(lat, lon, distanceM) {
    const distanceDegrees = distanceM / METERS_PER_DEGREE    
    const zone = await ParkingZone.find()
        .where('line')
        .within()
        .circle({ center: [lon, lat], radius: distanceDegrees})
    return zone
}

export async function findParkingZoneInBoundingBox(northLat, eastLon, southLat, westLon) {
    const equipment = await ParkingZone.find() 
        .where('line')
        .within({
            type: "Polygon",
            coordinates: [[
                [westLon, northLat],
                [eastLon, northLat],
                [eastLon, southLat],
                [westLon, southLat],
                [westLon, northLat]
            ]]
        })
    return equipment
}