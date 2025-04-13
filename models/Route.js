import mongoose from 'mongoose';
import { getDatabase } from "../db.js";

// Schema
const transitRoutesSchema = new mongoose.Schema({
  route_short_name: String,
  route_category: String,
  route_long_name: String,
  multilinestring: {
      type: {
          type: String,
          enum: ["MultiLineString"],
          required: true
      },
      coordinates: {
          type: [[[[Number]]]], 
          required: true
      }
  }
});
const COLLECTION_NAME = "Route2";
transitRoutesSchema.index({ shape: "2dsphere" });
transitRoutesSchema.index({ route_short_name: 1 });

const getRouteModel = () => {
  const db = getDatabase();
  return (
    db.models[COLLECTION_NAME] ||
    db.model(COLLECTION_NAME, transitRoutesSchema, COLLECTION_NAME)
  );
};

// Functions to expose to the outside world!
export async function createTransitRoute(route) {
  const TransitRoutes = getRouteModel();
  
  return await TransitRoutes.create(route);
}

export async function findAllTransitRoutes() {
  const TransitRoutes = getRouteModel();
  const transitRoutes = await TransitRoutes.find();
  return transitRoutes;
}

export async function findTransitRouteById(id) {
  const TransitRoutes = getRouteModel();
  const transitRoute = await TransitRoutes.findById(id);
  return transitRoute;
}

export async function findTransitRouteByRouteShortName(route_short_name) {
  const TransitRoutes = getRouteModel();
  const transitRoute = await TransitRoutes.findOne({
    route_short_name: route_short_name,
  });
  return transitRoute;
}

// In 1791, the metre was defined as 1 ten millionth the distance
// between the north pole and the equator travelling through Paris.
// 234 years later, Tony used this formula in a sofware development
// class focused on geographic queries.
const METERS_PER_DEGREE = 10000000 / 90;
export async function findTransitRoutesNear(lat, lon, distanceM) {
  const TransitRoutes = getRouteModel();
  const transitRoutes = await TransitRoutes.find()
    .where("shape")
    .near({
      center: {
        type: "Point",
        coordinates: [lon, lat],
      },
      maxDistance: distanceM,
      spherical: true,
    });

  return transitRoutes;
}
