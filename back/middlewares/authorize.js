//Import of required modules in this page
import { config } from 'dotenv'
import jwt from 'jsonwebtoken'

//Import internal dependancies
import { AuthenticationError } from '../error/customErrors.js'

//Activating environment variables management
config()

/**
 * Middleware for check of the Json Web Token existence and validity : if correct we continue with the controller, if not we go directly to the error middleware by passing the error to "next" function
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const jwtCheck = async (req, res, next) => {
	try {
		const authorization = req.headers.authorization
		if (!authorization || typeof authorization !== 'string') {
			throw new AuthenticationError(`Token absent ou mal formatté`)
		}
		const checkAuthorization = authorization.match(/(Bearer\s)(.+)/)
		if (!checkAuthorization) {
			throw new AuthenticationError(`Token absent ou mal formatté`)
		}
		const token = checkAuthorization[2]
		if (!token) {
			throw new AuthenticationError(`Token absent ou mal formatté`)
		}
		jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decodedToken) => {
			if (err) {
				throw new AuthenticationError(`Token invalide`)
			}
			//Transferring the userId's token into the response for later usage (if any)
			res.locals.userId = decodedToken.userId
			next()
		})
	} catch (err) {
		next(err)
	}
}

export default jwtCheck