import { Router } from "express";
import { createPlaygroundEquipment, findAllPlaygroundEquipment, findPlaygroundEquipmentById } from "../models/.js.js";

const router = Router();

// list all playgroundEquipment
router.get('/', async function (req, res) {
    try {
        const playgroundEquipment = await findAllPlaygroundEquipment()
        res.send(playgroundEquipment)
    }
    catch (error) {
        console.log(error)
        res.sendStatus(500)
    }
})

// create a new playgroundEquipment
router.post('/', async (req, res) => {
    const {name} = req.body

    if (req.body) {       
        const playgroundEquipment = createPlaygroundEquipment(name)
        return res.send(playgroundEquipment)
    }
    else {
        return res.sendStatus(400)
    }
})

// get a particular playgroundEquipment
router.get('/:playgroundEquipmentId', async function (req, res) {
    const id = req.params.playgroundEquipmentId
    try {
        const playgroundEquipment = findPlaygroundEquipmentById(id)
        res.send(playgroundEquipment)
    }
    catch (error) {
        console.log(error)
        res.sendStatus(500)
    }
})

export default router