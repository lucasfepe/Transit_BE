import { disconnectDb } from "../db.js"
import { createPlaygroundEquipment, findPlaygroundEquipmentByCityAssetCd } from "../models/playgroundEquipment.js"

const response = await fetch('https://data.calgary.ca/resource/bdu9-amk8.json?$limit=500')
if (!response.ok) {
    console.log('Problem getting data from the city', response)
    process.exit()
}

const equipment = await response.json()
for (const piece of equipment) {
    const {asset_cd, type_description, point} = piece

    const existingEquipment = await findPlaygroundEquipmentByCityAssetCd(asset_cd)
    if (existingEquipment) {
        console.log('Updating',asset_cd)
        existingEquipment.description = type_description
        existingEquipment.location = point
        await existingEquipment.save()
    }
    else {
        console.log('Creating', asset_cd, 'of', type_description)
        await createPlaygroundEquipment(asset_cd, type_description, point)
    }
}

await disconnectDb()
