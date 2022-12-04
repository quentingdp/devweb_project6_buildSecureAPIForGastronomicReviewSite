//Import of required modules in this page
import { config } from 'dotenv'

//Import internal dependancies
import Sauce from '../models/sauce.js'
import { RequestError, SauceError } from '../error/customErrors.js'

//Activating environment variables management
config()

export const getAllSauces = async (req, res, next) => {
	try {
		const allSauces = await Sauce.find()
		res.status(200).send(allSauces)
	} catch (err) {
		next(err)
	}
}

export const getOneSauce = async (req, res, next) => {
	try {
		const sauceId = req.params.id
		const checkSauceIdValidity = sauceId.match(/[0-9a-f]{24}/)
		if (!checkSauceIdValidity) {
			throw new RequestError("L'identifiant de la sauce est mal formatté.")
		}
		const thisSauce = await Sauce.findOne({ "_id": sauceId })
		if (!thisSauce) {
			throw new SauceError("La sauce demandée n'existe pas.")
		}
		res.status(200).send(thisSauce)
	} catch (err) {
		next(err)
	}
}

export const createSauce = async (req, res, next) => {
	try {
		const { name, manufacturer, description, mainPepper, heat } = JSON.parse(req.body.sauce)
		if (!name || !manufacturer || !description || !mainPepper || !heat) {
			throw new RequestError(`Impossible de créer la sauce : le nom, le fabricant, la description, le piment principal et la chaleur sont obligatoires.`)
		}
		//We get the userId from the JWT decoded token, in the res.locals
		const sauce = new Sauce({
			userId: res.locals.userId,
			name: name,
			manufacturer: manufacturer,
			description: description,
			mainPepper: mainPepper,
			imageUrl: `${process.env.SERVER_HOST}:${process.env.SERVER_PORT}/${req.file.path.replace('\\', '/')}`,
			heat: heat,
			likes: 0,
			dislikes: 0,
			usersLiked: [],
			usersDisliked: []
		})
		await sauce.save()
			.then(() => res.status(201).json({
				message: `La sauce a été créé dans la base de données`
			}))
	} catch (err) {
		next(err)
	}
}

export const updateSauce = async (req, res, next) => {
	res.json({ message: `Logique à construire` })
}

export const deleteSauce = async (req, res, next) => {
	res.json({ message: `Logique à construire` })
}

export const updateLikeSauce = async (req, res, next) => {
	res.json({ message: `Logique à construire` })
}