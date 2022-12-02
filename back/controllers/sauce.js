//Import of required modules in this page
import { config } from 'dotenv'
import bcrypt from 'bcrypt'

//Import internal dependancies
import User from '../models/user.js'
import { RequestError, UserError, AuthenticationError } from '../error/customErrors.js'

//Activating environment variables management
config()

export const getAllSauces = async (req, res, next) => {
	res.json({ message: `Logique à construire` })
}

export const getOneSauce = async (req, res, next) => {
	res.json({ message: `Logique à construire` })
}

export const createSauce = async (req, res, next) => {
	res.json({ message: `Logique à construire` })
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