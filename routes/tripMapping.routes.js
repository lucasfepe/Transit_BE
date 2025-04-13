const router = require('express').Router();
const tripMappingController = require('../controllers/tripMapping.controller');

router.post('/tripMappings', tripMappingController.getTripMappings);

module.exports = router;