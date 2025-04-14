// loadTransitRoutesFromCity.js
import { initDb, disconnectDb } from "../db.js";
import {
  createTransitRoute,
  findTransitRouteByRouteShortName,
} from "../services/route.service.js";

async function processRoutes() {
  try {
    

    await initDb();

    const response = await fetch(
      "https://data.calgary.ca/resource/hpnd-riq4.json"
    );
    if (!response.ok) {
      console.log("Problem getting data from the city", response);
      process.exit();
    }

    const transitRoutes = await response.json();
    for (const route of transitRoutes) {
      const { route_short_name, multilinestring, route_category, route_long_name } = route;

      const existingRoute = await findTransitRouteByRouteShortName(
        route_short_name
      );
      if (existingRoute) {
        console.log("Updating ", route_short_name);
        existingRoute.multilinestring = multilinestring;
        existingRoute.route_category = route_category;
        existingRoute.route_long_name = route_long_name;
        await existingRoute.save();
      } else {
        const newRoute = {
          route_short_name,
          multilinestring,
          route_category,
          route_long_name,
        };
        console.log("Creating ", route_short_name);
        await createTransitRoute(newRoute);
      }
    }
  } catch (error) {
    console.error("Error processing routes:", error);
  } finally {
    await disconnectDb();
  }
}

// Run the process
await processRoutes();