//Import of required modules in this page
import { config } from 'dotenv'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

//Import internal dependancies
import User from '../models/user.js'
import { RequestError, UserError, AuthenticationError } from '../error/customErrors.js'

//Activating environment variables management
config()

export const createUser = async (req, res, next) => {
	try {
		const { email, password } = req.body;
		if (!email || !password) {
			throw new RequestError(`Impossible de créer l'utilisateur : l'email et le mot de passe sont obligatoires.`)
		}
		//As for the recommandations, we don't test if the email already exist in the database, and we let mongoose throw it's own error when we'll try to save
		const hashedPassword = await bcrypt.hash(password, parseInt(process.env.SALT_COMPLEXITY))
		const user = new User({
			email: email,
			password: hashedPassword
		})
		await user.save()
			.then(() => res.status(201).json({
				message: `L'utilisateur ${email} a été créé dans la base de données`
			}))
	} catch (err) {
		next(err)
	}
}

export const connectUser = async (req, res, next) => {
	try {
		const { email, password } = req.body;
		if (!email || !password) {
			throw new RequestError(`Impossible de créer l'utilisateur : l'email et le mot de passe sont obligatoires.`)
		}
		const usersWithSameMail = await User.find({ email: email })
		if (usersWithSameMail.length === 0) {
			throw new UserError(`Le compte utilisateur ${email} n'existe pas.`)
		}
		const matchPassword = await bcrypt.compare(password, usersWithSameMail[0].password)
		if (!matchPassword) {
			throw new AuthenticationError(`Mot de passe incorrect`)
		}
		const token = jwt.sign({
			userId: usersWithSameMail[0]._id
		}, process.env.JWT_SECRET_KEY, { expiresIn: process.env.JWT_EXPIRES })
		return res.status(200).json({
			userId: usersWithSameMail[0]._id,
			token: token
		})
	} catch (err) {
		next(err)
	}
}