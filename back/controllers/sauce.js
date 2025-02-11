//Import of required modules in this page
import { config } from 'dotenv'
import { unlink } from 'node:fs'
import mongooseError from 'mongoose-error'

//Import internal dependancies
import Sauce from '../models/sauce.js'
import { RequestError, AuthorizationError, SauceError, MulterError, DataConsistencyError } from '../error/customErrors.js'

//Activating environment variables management
config()

/**
 * Checks the validity of the provided id as a SauceId, and throw an error if not valid
 * @param {string} sauceId 
 */
const checkSauceIdValidity = (sauceId) => {
	const validity = sauceId.match(/[0-9a-f]{24}/)
	if (!validity) {
		throw new RequestError("L'identifiant de la sauce est mal formatté.")
	}
}

/**
 * Controller for recovering all Sauces data : we send the data at the same format Mongo DB returns it
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
export const getAllSauces = async (req, res, next) => {
	try {
		Sauce.find()
			.then((data) => res.status(200).send(data))
			.catch((err) => { throw mongooseError(err) })
	} catch (err) {
		next(err)
	}
}

/**
 * Controller for recovering the Sauce which id is given : we send the data at the same format Mongo DB returns it (after verifying the Sauce id exist)
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
export const getOneSauce = async (req, res, next) => {
	try {
		const sauceId = req.params.id
		checkSauceIdValidity(sauceId)
		let thisSauce
		await Sauce.findOne({ "_id": sauceId })
			.then((data) => { thisSauce = data })
			.catch((err) => { throw mongooseError(err) })
		if (!thisSauce) {
			throw new SauceError("La sauce demandée n'existe pas.")
		}
		res.status(200).send(thisSauce)
	} catch (err) {
		next(err)
	}
}

/**
 * Controller for creating a new sauce from scratch : we check all the required fields exist, then create the sauce. NB: in the error management, we rollback multer, as the file is preloaded previously any check
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
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
		sauce.save()
			.then(() => res.status(201).json({
				message: `La sauce a été créé dans la base de données`
			}))
			.catch((err) => { throw mongooseError(err) })
	} catch (err) {
		//rollback of middleware multer in case of any error : we don't want to keep the image loaded
		try {
			unlink(req.file.path, (err) => {
				if (err) { throw new MulterError('Erreur dans le traitement du fichier') }
			})
			next(err)
		} catch (err) {
			next(err)
		}
	}
}

/**
 * Controller for updating a sauce : we check the sauce exist, then if the user connected is the sauce owner, then depending if the image is provided or not, we update only the provided fields
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
export const updateSauce = async (req, res, next) => {
	try {
		const sauceId = req.params.id
		checkSauceIdValidity(sauceId)
		let thisSauce
		await Sauce.findOne({ "_id": sauceId })
			.then((data) => { thisSauce = data })
			.catch((err) => { throw mongooseError(err) })
		if (!thisSauce) {
			throw new SauceError("La sauce demandée n'existe pas.")
		}
		//We check if the user connected is not the owner of the sauce
		if (thisSauce.userId !== res.locals.userId) {
			throw new AuthorizationError("L'utilisateur connecté n'a pas le droit d'effectuer l'opération demandée")
		}
		//We could have 2 different inputs : we split the cases either we receive an "application/json" body (without image) or a "multipart/form-data" (with image)
		if (req.headers["content-type"] === "application/json") {
			//New values are optionnal : we keep original values if not sent in the request
			let { name, manufacturer, description, mainPepper, heat } = req.body
			name ??= thisSauce.name
			manufacturer ??= thisSauce.manufacturer
			description ??= thisSauce.description
			mainPepper ??= thisSauce.mainPepper
			heat ??= thisSauce.heat
			Sauce.updateOne({ "_id": sauceId }, {
				name: name,
				manufacturer: manufacturer,
				description: description,
				mainPepper: mainPepper,
				heat: heat
			})
				.then(() => res.status(200).json({ message: `La sauce ${sauceId} a été mise à jour.` }))
				.catch((err) => { throw mongooseError(err) })
		} else {
			let { name, manufacturer, description, mainPepper, heat } = JSON.parse(req.body.sauce)
			name ??= thisSauce.name
			manufacturer ??= thisSauce.manufacturer
			description ??= thisSauce.description
			mainPepper ??= thisSauce.mainPepper
			heat ??= thisSauce.heat
			const localFileUrl = thisSauce.imageUrl.split('/').slice(3).join('/')
			unlink(localFileUrl, (err) => {
				if (err) { throw new MulterError('Erreur dans la suppression de la photo de la sauce') }
				Sauce.updateOne({ "_id": sauceId }, {
					name: name,
					manufacturer: manufacturer,
					description: description,
					mainPepper: mainPepper,
					imageUrl: `${process.env.SERVER_HOST}:${process.env.SERVER_PORT}/${req.file.path.replace('\\', '/')}`,
					heat: heat
				})
					.then(() => res.status(200).json({ message: `La sauce ${sauceId} a été mise à jour.` }))
					.catch((err) => { throw mongooseError(err) })
			})
		}
	} catch (err) {
		//rollback of middleware multer in case of any error : we don't want to keep the image loaded
		try {
			unlink(req.file.path, (err) => {
				if (err) { throw new MulterError('Erreur dans le traitement du fichier') }
			})
			next(err)
		} catch (err) {
			next(err)
		}
	}
}

/**
 * Controller for deleting a sauce : we check the sauce exist, then if the user connected is the sauce owner, then we delete the image of the sauce and the sauce from the database
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
export const deleteSauce = async (req, res, next) => {
	try {
		const sauceId = req.params.id
		checkSauceIdValidity(sauceId)
		let thisSauce
		await Sauce.findOne({ "_id": sauceId })
			.then((data) => { thisSauce = data })
			.catch((err) => { throw mongooseError(err) })
		if (!thisSauce) {
			throw new SauceError("La sauce demandée n'existe pas.")
		}
		//We check if the user connected is not the owner of the sauce
		if (thisSauce.userId !== res.locals.userId) {
			throw new AuthorizationError("L'utilisateur connecté n'a pas le droit d'effectuer l'opération demandée")
		}
		const localFileUrl = thisSauce.imageUrl.split('/').slice(3).join('/')
		unlink(localFileUrl, (err) => {
			if (err) { throw new MulterError('Erreur dans la suppression de la photo de la sauce') }
			Sauce.deleteOne({ "_id": sauceId })
				.then(() => res.status(200).json({ message: `La sauce ${sauceId} a été supprimée de la base de données.` }))
				.catch((err) => { throw mongooseError(err) })
		})
	} catch (err) {
		next(err)
	}
}

/**
 * Controller for updating a like on a sauce : We check the sauce exist, then if the format of informations provided are correct.
 * NB: userId is expected in the body, but we don't trust by default the information sent at this place. So we do an additionnal check if the userId in the body equals the userId of the JWT
 * At last, depending on the value of the like and the pre-existing status, we update the sauce informations with like and dislike fields
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
export const updateLikeSauce = async (req, res, next) => {
	try {
		const sauceId = req.params.id
		checkSauceIdValidity(sauceId)
		let thisSauce
		await Sauce.findOne({ "_id": sauceId })
			.then((data) => { thisSauce = data })
			.catch((err) => { throw mongooseError(err) })
		if (!thisSauce) {
			throw new SauceError("La sauce demandée n'existe pas.")
		}
		const { likes: currentLikes, dislikes: currentDislikes, usersLiked: newUsersLiked, usersDisliked: newUsersDisliked } = thisSauce
		const { userId, like } = req.body
		if (!userId || typeof like !== "number") {
			throw new RequestError(`Impossible de mettre à jour le like : le UserId et le like sont obligatoires.`)
		}
		if (userId !== res.locals.userId) {
			throw new AuthorizationError(`Vous ne pouvez mettre à jour les likes d'un autre utilisateur.`)
		}
		//Extracts information about the current like status of the user on this sauce
		//If indexInLike has a positive value, it means or user had previously liked the sauce. If indexInDislike is positive, our user previously disliked. We'll use this values in the followint to switch the cases
		const indexInLike = newUsersLiked.findIndex((element) => element === res.locals.userId)
		const indexInDislike = newUsersDisliked.findIndex((element) => element === res.locals.userId)
		//Additional test to check if the data is not corrupted : a user cannot like and dislike at the same time a sauce
		if (indexInLike !== -1 && indexInDislike !== -1) {
			throw new DataConsistencyError(`L'état de la base de données est incohérent sur les likes de la sauce ${sauceId}`)
		}
		//Updating the like. We check the conditions depending of the like provided and the previously existing like status
		switch (like) {
			//The request wants to add a like
			case 1: {
				if (indexInDislike !== -1) {
					newUsersLiked.push(res.locals.userId)
					newUsersDisliked.splice(indexInDislike, 1)
					Sauce.updateOne({ "_id": sauceId }, {
						likes: currentLikes + 1,
						dislikes: currentDislikes - 1,
						usersLiked: newUsersLiked,
						usersDisliked: newUsersDisliked
					})
						.then(() => res.status(200).json({ message: `Les likes sur la sauce ${sauceId} ont été mis à jour.` }))
						.catch((err) => { throw mongooseError(err) })
				} else if (indexInLike === -1) {
					newUsersLiked.push(res.locals.userId)
					Sauce.updateOne({ "_id": sauceId }, {
						likes: currentLikes + 1,
						usersLiked: newUsersLiked
					})
						.then(() => res.status(200).json({ message: `Les likes sur la sauce ${sauceId} ont été mis à jour.` }))
						.catch((err) => { throw mongooseError(err) })
				} else {
					res.status(204).json({})
				}
				break
			}
			//The request wants to reset like and dislike
			case 0: {
				if (indexInLike !== -1) {
					newUsersLiked.splice(indexInLike, 1)
					Sauce.updateOne({ "_id": sauceId }, {
						likes: currentLikes - 1,
						usersLiked: newUsersLiked
					})
						.then(() => res.status(200).json({ message: `Les likes sur la sauce ${sauceId} ont été mis à jour.` }))
						.catch((err) => { throw mongooseError(err) })
				} else if (indexInDislike !== -1) {
					newUsersDisliked.splice(indexInDislike, 1)
					Sauce.updateOne({ "_id": sauceId }, {
						dislikes: currentDislikes - 1,
						usersDisliked: newUsersDisliked
					})
						.then(() => res.status(200).json({ message: `Les likes sur la sauce ${sauceId} ont été mis à jour.` }))
						.catch((err) => { throw mongooseError(err) })
				} else {
					res.status(204).json({})
				}
				break
			}
			//The request wants to add a dislike
			case -1: {
				if (indexInLike !== -1) {
					newUsersLiked.splice(indexInLike, 1)
					newUsersDisliked.push(res.locals.userId)
					Sauce.updateOne({ "_id": sauceId }, {
						likes: currentLikes - 1,
						dislikes: currentDislikes + 1,
						usersLiked: newUsersLiked,
						usersDisliked: newUsersDisliked
					})
						.then(() => res.status(200).json({ message: `Les likes sur la sauce ${sauceId} ont été mis à jour.` }))
						.catch((err) => { throw mongooseError(err) })
				} else if (indexInDislike === -1) {
					newUsersDisliked.push(res.locals.userId)
					Sauce.updateOne({ "_id": sauceId }, {
						dislikes: currentDislikes + 1,
						usersDisliked: newUsersDisliked
					})
						.then(() => res.status(200).json({ message: `Les likes sur la sauce ${sauceId} ont été mis à jour.` }))
						.catch((err) => { throw mongooseError(err) })
				} else {
					res.status(204).json({})
				}
				break
			}
			// the request has provided a like value which is not -1, 0 or 1 : it is meaningless
			default: {
				throw new RequestError(`Impossible de mettre à jour le like : la valeur du like n'est pas conforme.`)
			}
		}
	} catch (err) {
		next(err)
	}
}