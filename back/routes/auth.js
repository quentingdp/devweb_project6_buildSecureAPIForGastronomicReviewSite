//Import of required modules in this page
import express from 'express'

//Import internal dependancies
import { createUser, connectUser } from '../controllers/auth.js'
import error from '../middlewares/error.js'

let router = express.Router()

//Defining routing for Users
router.post('/signup', createUser)
router.post('/login', connectUser)

//Adding error middleware at the end
router.use(error)

export default router