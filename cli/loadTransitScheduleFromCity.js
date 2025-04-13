import { initDb, disconnectDb } from "../db.js";
import { createTrip, findTripByTripId } from "../models/Trip.js";
import JSZip from "jszip";
import { parse } from "csv-parse/sync";

async function processTrips() {
  try {
    // Initialize database connection
    await initDb();
    // Fetch the ZIP file
    const response = await fetch(
      "https://data.calgary.ca/download/npk7-z3bj/application%2Fx-zip-compressed"
    );
    if (!response.ok) {
      console.log("Problem getting data from the city", response);
      return;
    }

    // Get the array buffer from the response
    const arrayBuffer = await response.arrayBuffer();

    // Load the ZIP file
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(arrayBuffer);

    // Get the trips.txt file from the ZIP
    const tripsFile = zipContent.file("trips.txt");
    if (!tripsFile) {
      console.log("trips.txt not found in the ZIP file");
      return;
    }

    // Get the content of trips.txt and parse it as CSV
    const csvContent = await tripsFile.async("string");
    const trips = parse(csvContent, {
      // Changed from csv.parse to parse
      columns: true,
      skip_empty_lines: true,
    });

    // Process each trip
    for (const trip of trips) {
      const { route_id, trip_id } = trip;

      const existingTrip = await findTripByTripId(trip_id);
      if (existingTrip) {
        console.log("Updating", trip_id);
        existingTrip.route_id = Number(route_id.split("-")[0]); // Assuming route_id is in the format "routeId_1"
        await existingTrip.save();
      } else {
        const newTrip = {
          route_id: Number(route_id.split("-")[0]),
          trip_id,
        };

        console.log("Creating ", trip_id);
        await createTrip(newTrip);
      }
    }
  } catch (error) {
    console.error("Error processing trips:", error);
  } finally {
    // Close database connection
    await disconnectDb();
  }
}

// Run the process
await processTrips();
