const express = require('express')
const router = express.Router()
const controller = require('../controllers/meetController')

router.get('/', controller.listMeetings)
router.get('/:id', controller.getMeetingByKey)
router.post('/', controller.createMeeting)
router.post('/:id', controller.updateMeeting)
router.delete('/:id', controller.deleteMeeting)

module.exports = router
