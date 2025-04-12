import { disconnectDb } from "../db.js"
import { createParkingZone, findParkingZoneByGlobalGuid } from "../models/parkingZone.js"


const response = await fetch('https://data.calgary.ca/resource/45az-7kh9.json?$limit=500')
if (!response.ok) {
    console.log('Problem getting data from the city', response)
    process.exit()
}

const zone = await response.json()
for (const piece of zone) {
    const {address_desc,the_geom,globalid_guid} = piece

    const existingZone = await findParkingZoneByGlobalGuid(globalid_guid)
    if (existingZone) {
        console.log('updating',globalid_guid)
        existingZone.addressDesc = address_desc
        existingZone.line = the_geom
        await existingZone.save()
    }
    else {
        console.log('Creating', globalid_guid, 'at', address_desc)
        await createParkingZone(globalid_guid, address_desc, the_geom)
    }
}

await disconnectDb()