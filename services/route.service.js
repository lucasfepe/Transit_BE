import { getRouteModel } from "../models/Route.js";

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
