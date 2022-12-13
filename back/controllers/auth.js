//Import of required modules in this page
import { config } from 'dotenv'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import mongooseError from 'mongoose-error'
import passwordValidator from 'password-validator'

//Import internal dependancies
import User from '../models/user.js'
import { RequestError, UserError, AuthenticationError } from '../error/customErrors.js'

//Activating environment variables management
config()

/**
 * Controller for User Creation : if we receive the email + password, we hash the password then save the new user in the database. If the email already exist, it'll be catched directly by mongoose constraints
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
export const createUser = async (req, res, next) => {
	try {
		const { email, password } = req.body
		if (!email || !password) {
			throw new RequestError(`Impossible de créer l'utilisateur : l'email et le mot de passe sont obligatoires.`)
		}
		//As for the recommandations, we don't test if the email already exist in the database, and we let mongoose throw it's own error when we'll try to save
		//We check if the password requested is strong enough : minimum lenght 8 + must have uppercase, lowercase and digit
		let passwordPattern = new passwordValidator();
		passwordPattern
			.is().min(8)
			.has().uppercase()
			.has().lowercase()
			.has().digits()
		if (!passwordPattern.validate(password)) {
			throw new RequestError(`Le mot de passe proposé n'est pas assez complexe`)
		}
		const hashedPassword = await bcrypt.hash(password, parseInt(process.env.SALT_COMPLEXITY))
		const user = new User({
			email: email,
			password: hashedPassword
		})
		await user.save()
			.then(() => res.status(201).json({
				message: `L'utilisateur ${email} a été créé dans la base de données`
			}))
			.catch((err) => { throw mongooseError(err) })
	} catch (err) {
		next(err)
	}
}

/**
 * Controller for User login : we first check that the user exist, then we compare the password provided to the hashed password stored. If ok, we provide the JWT token in response.
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
export const connectUser = async (req, res, next) => {
	try {
		const { email, password } = req.body
		if (!email || !password) {
			throw new RequestError(`Impossible de connecter l'utilisateur : l'email et le mot de passe sont obligatoires.`)
		}
		let usersWithSameMail
		await User.findOne({ email: email })
			.then((data) => { usersWithSameMail = data })
			.catch((err) => { throw mongooseError(err) })
		if (!usersWithSameMail) {
			throw new UserError(`Le compte utilisateur ${email} n'existe pas.`)
		}
		const matchPassword = await bcrypt.compare(password, usersWithSameMail.password)
		if (!matchPassword) {
			throw new AuthenticationError(`Mot de passe incorrect`)
		}
		const token = jwt.sign({
			userId: usersWithSameMail._id
		}, process.env.JWT_SECRET_KEY, { expiresIn: process.env.JWT_EXPIRES })
		return res.status(200).json({
			userId: usersWithSameMail._id,
			token: token
		})
	} catch (err) {
		next(err)
	}
}