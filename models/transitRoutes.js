import { connectDb } from "../db.js";

const mongoose = await connectDb();

// Schema 
const transitRoutesSchema = new mongoose.Schema({
    route_short_name: String,
    shape: {
   
      
        type: {
            type: String,
            enum: ['MultiLineString'],
            required: true
        },
        coordinates: {
            type: [[[Number]]],
            required: true
        }
    }}
)

transitRoutesSchema.index({ shape: '2dsphere' })

// Models
const TransitRoutes = mongoose.model('transitRoutes', transitRoutesSchema, 'transitRoutes')

// Functions to expose to the outside world!
export async function createTransitRoute(route_short_name, shape) {
    const newTransitRoute = await TransitRoutes.create({ 
        route_short_name,
        shape
    })    
    return newTransitRoute
}

export async function findAllTransitRoutes() {
    const transitRoutes = await TransitRoutes.find()
    return transitRoutes
}

export async function findTransitRouteById(id) {
    const transitRoute = await TransitRoutes.findById(id)
    return transitRoute
}

export async function findTransitRouteByRouteShortName(route_short_name) {
    const transitRoute = await TransitRoutes.findOne({ route_short_name: route_short_name})
    return transitRoute
}

// In 1791, the metre was defined as 1 ten millionth the distance
// between the north pole and the equator travelling through Paris. 
// 234 years later, Tony used this formula in a sofware development
// class focused on geographic queries.
const METERS_PER_DEGREE = 10000000/90 

    export async function findTransitRoutesNear(lat, lon, distanceM) {
        const distanceDegrees = distanceM / METERS_PER_DEGREE    
        const transitRoutes = await TransitRoutes.find()
            .where('shape')
            .near({ 
                center: {
                    type: 'Point',
                    coordinates: [lon, lat]
                },
                maxDistance: distanceM,
                spherical: true 
            })
            
        return transitRoutes
        
    }

