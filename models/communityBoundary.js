import { connectDb } from "../db.js";

const mongoose = await connectDb();

// Schema 
const communityBoundarySchema = new mongoose.Schema({
    commCode: String,
    name: String,
    boundary: {
        type: {
            type: String,
            enum: ['MultiPolygon'],
            required: true
        },
        coordinates: {
            type: [[[[Number]]]],
            required: true
        }
    }
})
communityBoundarySchema.index({ location: '2dsphere' })

// Models
const CommunityBoundary = mongoose.model('communityBoundary', communityBoundarySchema, 'communityBoundary')

// Functions to expose to the outside world!
export async function createCommunityBoundary(commCode, name, boundary) {
    const newCommunityBoundary = await CommunityBoundary.create({
        commCode: commCode,
        name: name,
        boundary: boundary
    })    
    return newCommunityBoundary
}

export async function findAllCommunityBoundaries() {
    const communityBoundary = await CommunityBoundary.find()
    return communityBoundary
}

export async function findCommunityBoundaryById(id) {
    const communityBoundary = await CommunityBoundary.findById(id)
    return communityBoundary
}

export async function findCommunityBoundaryByCommCode(commCode) {
    const communityBoundary = await CommunityBoundary.findOne({ commCode: commCode })
    return communityBoundary
}

// In 1791, the metre was defined as 1 ten millionth the distance
// between the north pole and the equator travelling through Paris. 
// 234 years later, Tony used this formula in a sofware development
// class focused on geographic queries.
const METERS_PER_DEGREE = 10000000/90 

export async function findCommunityBoundaryNear(lat, lon, distanceM) {
    // const distanceDegrees = distanceM / METERS_PER_DEGREE
    // const equipment = await PlaygroundEquipment.find()
    //     .where('location')
    //     .within()
    //     .circle({ center: [lon, lat], radius: distanceDegrees })
    // return equipment
    return []
}

export async function findCommunitiesInBoundingBox(northLat, eastLon, southLat, westLon){
    const communities = await CommunityBoundary.find()
        .where('boundary')
        .within({ box: [[eastLon, northLat],[westLon, southLat]] });
    return communities;        
}
export async function findCommunitiesWithIntersection(northLat, eastLon, southLat, westLon){
    const communities = await CommunityBoundary.find()
        .where('boundary')
        .intersects()
        .geometry({
            type: 'LineString',
            coordinates: [[eastLon, northLat], [westLon, southLat]]
        })
        // .within({ box: [[eastLon, northLat],[westLon, southLat]] });
    return communities;        
}