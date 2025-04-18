import { getRouteModel } from "../models/Route.js";

// Conversion factor: 1 mile = 1609.34 meters
const METERS_PER_MILE = 1609.34;

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


// Function to convert miles to meters
function milesToMeters(miles) {
  return miles * METERS_PER_MILE;
}
const METERS_PER_DEGREE = 10000000/90
export async function findTransitRoutesNear(lat, lon, distanceM) {
    console.log("d in m:",distanceM);
    const TransitRoutes = getRouteModel();
    const distanceDegrees = distanceM / METERS_PER_DEGREE 
    // Convert miles to meters
    const distanceMeters = milesToMeters(distanceM);

    const transitRoutes = await TransitRoutes.find()
        .where("multilinestring")
        .near({
            center: {
                type: "Point",
                coordinates: [lon, lat],
            },
            maxDistance: distanceM, // Use the converted distance
            spherical: true,
        });

    return transitRoutes;
}