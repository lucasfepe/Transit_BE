import { disconnectDb } from "../db.js"
import { createTransitRoute, findTransitRouteByRouteShortName } from "../models/transitRoutes.js"

const response = await fetch('https://data.calgary.ca/resource/hpnd-riq4.json')
if (!response.ok) {
    console.log('Problem getting data from the city', response)
    process.exit()
}

const transitRoutes = await response.json()
for (const route of transitRoutes) {
    const {route_short_name, multilinestring} = route

    const existingRoute = await findTransitRouteByRouteShortName(route_short_name)
    if (existingRoute) {
        console.log('Updating ', route_short_name)
        existingRoute.multilinestring = multilinestring
        await existingRoute.save()
    }
    else {
        console.log('Creating ', route_short_name)
        await createTransitRoute(route_short_name, multilinestring)
    }
}

await disconnectDb()
