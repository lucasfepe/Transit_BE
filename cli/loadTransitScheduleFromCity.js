import { initDb, disconnectDb } from "../db.js";
import { findTripByTripId, batchUpsertTrips } from "../services/trip.service.js";
import { findStopOrderByTripIdAndStopId, batchUpsertStopOrders } from "../services/stopOrder.service.js";
import { findStopByStopId, batchUpsertStops } from "../services/stop.service.js";
import JSZip from "jszip";
import { parse } from "csv-parse/sync";

// Modular batch processing function
async function processBatch(items, batchSize, processFn, entityName) {
  const totalItems = items.length;
  console.log(`Processing ${totalItems} ${entityName}...`);
  
  let batch = [];
  let processedCount = 0;
  
  for (const item of items) {
    batch.push(item);
    
    if (batch.length >= batchSize) {
      const result = await processFn(batch);
      processedCount += batch.length;
      console.log(`Processed ${processedCount}/${totalItems} ${entityName} (${Math.round(processedCount/totalItems*100)}%) - Upserted: ${result.modifiedCount + result.upsertedCount}`);
      batch = [];
    }
  }
  
  // Process any remaining items
  if (batch.length > 0) {
    const result = await processFn(batch);
    processedCount += batch.length;
    console.log(`Processed ${processedCount}/${totalItems} ${entityName} (100%) - Upserted: ${result.modifiedCount + result.upsertedCount}`);
  }
}

async function processSchedule() {
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

    // Get the files from the ZIP
    const tripsFile = zipContent.file("trips.txt");
    const stopTimeFile = zipContent.file("stop_times.txt");
    const stopFile = zipContent.file("stops.txt");
    
    const BATCH_SIZE = 5000;

    // Process trips.txt
    // if (tripsFile) {
    //   const csvContent = await tripsFile.async("string");
    //   const trips = parse(csvContent, {
    //     columns: true,
    //     skip_empty_lines: true,
    //   });
      
    //   await processBatch(trips, BATCH_SIZE, batchUpsertTrips, "trips");
    // } else {
    //   console.log("trips.txt not found in the ZIP file");
    // }

    // Process stop_times.txt
    // if (stopTimeFile) {
    //   const csvContent = await stopTimeFile.async("string");
    //   const stopOrders = parse(csvContent, {
    //     columns: true,
    //     skip_empty_lines: true,
    //   });
      
    //   await processBatch(stopOrders, BATCH_SIZE, batchUpsertStopOrders, "stop orders");
    // } else {
    //   console.log("stop_times.txt not found in the ZIP file");
    // }

    // Process stops.txt
    if (stopFile) {
      const csvContent = await stopFile.async("string");
      const stops = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
      });
      
      await processBatch(stops, BATCH_SIZE, batchUpsertStops, "stops");
    } else {
      console.log("stops.txt not found in the ZIP file");
    }
    
    console.log("Schedule processing completed successfully!");
  } catch (error) {
    console.error("Error processing schedule:", error);
  } finally {
    // Close database connection
    await disconnectDb();
    console.log("Database connection closed.");
  }
}

// Run the process
await processSchedule();