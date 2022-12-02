//Import of required modules in this page
import express from 'express'

//Import internal dependancies
import { getAllSauces, getOneSauce, createSauce, updateSauce, deleteSauce, updateLikeSauce } from '../controllers/sauce.js'
import error from '../middlewares/error.js'
import multer from '../middlewares/multer.js'
import jwtCheck from '../middlewares/jwtCheck.js'

let router = express.Router()

//Adding the middleware checking of the Json Web Token validity at the beginning
router.use(jwtCheck)

router.get('/', getAllSauces);
router.get('/:id', getOneSauce);
router.post('/', multer, createSauce);
router.put('/:id', multer, updateSauce);
router.delete('/:id', deleteSauce);
router.post('/:id/like', updateLikeSauce);

//Adding error middleware at the end
router.use(error)

export default router