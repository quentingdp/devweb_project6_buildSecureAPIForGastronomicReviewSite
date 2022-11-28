//Import of required modules in this page
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import multer from 'multer';

/**
 * main function
 */
const main = async () => {
	//Activating environment variables management
	dotenv.config();
	openWebServer();
};

/**
 * Function that opens the web server, defines API routes and listen on port given in environment
 */
const openWebServer = () => {
	const webServer = express();
	webServer.use(express.json());
	webServer.use(cors());

	const upload = multer({ dest: "./uploads/" });
	webServer.use('/uploads', express.static('./uploads'));

	webServer.post('/api/auth/signup', apiCreateUser);
	webServer.post('/api/auth/login', apiConnectUser);
	webServer.get('/api/sauces', apiGetAllSauces);
	webServer.get('/api/sauces/[a-f0-9]+/', routeTester);
	webServer.post('/api/sauces', upload.single("image"), apiPostNewSauce);
	webServer.put('/api/sauces/[a-f0-9]+/', routeTester);
	webServer.delete('/api/sauces/[a-f0-9]+/', routeTester);
	webServer.post('/api/sauces/[a-f0-9]+/like/', routeTester);
	/*
	webServer.get('/*', return404);
	webServer.post('/*', return404);
	webServer.put('/*', return404);
	webServer.delete('/*', return404);
	*/
	webServer.listen(process.env.SERVER_PORT);
	console.log(`Serveur web démarré : Connectez-vous sur http://localhost:${process.env.SERVER_PORT}/ pour le contacter`);
};


//TESTS!!!! How to upload an image. Works with Postman, but very basically, and was not tested the sending of JSON properties + image
/**
 * TEST... to be sure the route exists, a basic function
 * @param {stream.Readable} req 
 * @param {stream.Writable} res 
 */
const routeTester = (req, res) => {
	res.send("La route d'API existe");
};
//Default answer to return if the API route doesn't exist
/*
const return404 = (req, res) => {
	res.send('erreur 404');
};
*/

/**
 * Open connection to database
 * @returns {Promise<mongoose.Connection | undefined>}
 */
const sessionDBConnect = async () => {
	try {
		return mongoose.createConnection(`mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.MONGO_DB_CLUSTERNAME}.3t7ius9.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`);
	} catch (e) {
		throw new Error(`Connexion impossible à la base de données: ${e.message}`);
	}
};
/**
 * Close connection to database
 * @param {mongoose.Connection} sessionDB 
 */
const sessionDBDisconnect = async (sessionDB) => {
	await sessionDB.close();
};
/**
 * Defining schemas to use in this project : for a sauce
 * @returns {mongoose.Schema} Sauce mongoose schema
 */
const schemaDefinitionSauce = () => {
	return new mongoose.Schema({
		userId: String,
		name: String,
		manufacturer: String,
		description: String,
		mainPepper: String,
		imageUrl: String,
		heat: Number,
		likes: Number,
		dislikes: Number,
		usersLiked: [String],
		usersDisliked: [String]
	});
};
/**
 * Defining schemas to use in this project : for a user
 * @returns {mongoose.Schema} User mongoose schema
 */
const schemaDefinitionUser = () => {
	return new mongoose.Schema({
		email: String,
		password: String
	});
};
/**
 * Testing if the input json has all required properties to be a sauce
 * @param {string} sauceCandidate Parameter json-formatted that is a candidate to hold all sauce properties
 * @returns {boolean}
 */
const isCorrectInputSauce = (sauceCandidate) => {
	return Object.hasOwn(sauceCandidate, 'name') && Object.hasOwn(sauceCandidate, 'manufacturer') && Object.hasOwn(sauceCandidate, 'description') && Object.hasOwn(sauceCandidate, 'mainPepper') && Object.hasOwn(sauceCandidate, 'heat');
};
/**
 * Testing if the input json has all required properties to be a user
 * @param {string} userCandidate Parameter json-formatted that is a candidate to hold all user properties
 * @returns {boolean}
 */
const isCorrectInputUser = (userCandidate) => {
	return Object.hasOwn(userCandidate, 'email') && Object.hasOwn(userCandidate, 'password');
};
/**
 * Testing if the token is valid
 * @param {stream.Readable.headers} reqHeaders 
 * @returns {boolean}
 */
const isAuthorized = (reqHeaders) => {
	try {
		const [bearerKeyword, token] = reqHeaders.authorization.split(' ');
		const [tokenKey, tokenOwner] = token.split('|');
		//work out what is expected as far the token and change this function!!!
		return tokenKey === `TOKENPIPO`;
	} catch {
		console.error("La requête n'a pas envoyé d'entête Authorization correctement formatté.");
		return false;
	};
};
/**
 * Function that deduces the user id launching the requests out of the bearer token
 * @param {stream.Readable.headers} reqHeaders 
 * @returns {string} MongoDB id of the user bearer of the token
 */
const getUserIdConnected = (reqHeaders) => {
	try {
		const [bearerKeyword, token] = reqHeaders.authorization.split(' ');
		const [tokenKey, tokenOwner] = token.split('|');
		//work out what is expected as far the token and change this function!!!
		return tokenOwner;
	} catch {
		console.error("La requête n'a pas envoyé d'entête Authorization correctement formatté.");
		return null;
	};
};
/**
 * Creates the user if the account doesn't already exist
 * @param {stream.Readable} req 
 * @param {stream.Writable} res 
 */
const apiCreateUser = async (req, res) => {
	//Testing if the formatting is correct
	if (isCorrectInputUser(req.body)) {
		//Open connection to database
		const sessionDB = await sessionDBConnect();
		//Loading structure of users
		const userSchema = schemaDefinitionUser();
		const userModel = sessionDB.model('user', userSchema);
		//Looking if a user of the same mail already exist. If yes, the request returns an error
		const usersWithSameMail = await userModel.find({ email: req.body.email });
		if (usersWithSameMail.length === 0) {
			//We hash the password
			const hashedPassword = await bcrypt.hash(req.body.password, parseInt(process.env.SALT_COMPLEXITY));
			//We create the user in the database
			const user = new userModel({
				email: req.body.email,
				password: hashedPassword
			});
			await user.save();
			res.status(201).json({
				message: `L'utilisateur ${req.body.email} a été créé dans la base de données`
			});
		} else {
			res.status(403).json({
				message: `Impossible de créer l'utilisateur ${req.body.email}, un compte existe déjà avec cette adresse mail.`
			});
		};
		//Close connection to database
		sessionDBDisconnect(sessionDB);
	} else {
		res.status(403).json({
			message: `Impossible de créer l'utilisateur : l'email et le mot de passe sont obligatoires.`
		});
	};
};
/**
 * Login the user if the email + password match
 * @param {stream.Readable} req 
 * @param {stream.Writable} res 
 */
const apiConnectUser = async (req, res) => {



	//work out what is expected as for the TOKEN content!!!



	//Testing if the formatting is correct
	if (isCorrectInputUser(req.body)) {
		//Open connection to database
		const sessionDB = await sessionDBConnect();
		//Loading structure of users
		const userSchema = schemaDefinitionUser();
		const userModel = sessionDB.model('user', userSchema);
		//Looking if a user of the same mail already exist. If yes, the request returns an error
		const usersWithSameMail = await userModel.find({ email: req.body.email });
		if (usersWithSameMail.length !== 0) {
			//We compare the password provided to the hashed password saved in the database
			const matchPassword = await bcrypt.compare(req.body.password, usersWithSameMail[0].password);
			if (matchPassword) {
				res.status(200).json({
					userId: usersWithSameMail[0]._id,
					token: `TOKENPIPO|${usersWithSameMail[0]._id}`
				});
			} else {
				res.status(401).json({
					message: `Mot de passe incorrect`
				});
			};
		} else {
			res.status(403).json({
				message: `Le compte utilisateur ${req.body.email} n'existe pas.`
			});
		};
		//Close connection to database
		sessionDBDisconnect(sessionDB);
	} else {
		res.status(403).json({
			message: `Impossible de connecter l'utilisateur : l'email et le mot de passe sont obligatoires.`
		});
	};
};
/**
 * Get all the sauces of the database
 * @param {stream.Readable} req 
 * @param {stream.Writable} res 
 */
const apiGetAllSauces = async (req, res) => {
	if (isAuthorized(req.headers)) {
		//Open connection to database
		const sessionDB = await sessionDBConnect();
		const sauceSchema = schemaDefinitionSauce();
		const sauceModel = sessionDB.model('sauce', sauceSchema);
		//Getting and returning all the sauces of the database
		res.status(200).send(await sauceModel.find());
		//Close connection to database
		sessionDBDisconnect(sessionDB);
	} else {
		res.status(401).json({
			message: `Utilisateur non-autorisé`
		});
	};
};
/**
 * Creates the new sauce provided
 * @param {stream.Readable} req 
 * @param {stream.Writable} res 
 */
const apiPostNewSauce = async (req, res) => {
	if (isAuthorized(req.headers)) {
		//Testing if the formatting is correct
		const sauceCandidate = JSON.parse(req.body.sauce);
		if (isCorrectInputSauce(sauceCandidate)) {
			//Open connection to database
			const sessionDB = await sessionDBConnect();
			const sauceSchema = schemaDefinitionSauce();
			const sauceModel = sessionDB.model('sauce', sauceSchema);
			const sauce = new sauceModel({
				userId: getUserIdConnected(req.headers),
				name: sauceCandidate.name,
				manufacturer: sauceCandidate.manufacturer,
				description: sauceCandidate.description,
				mainPepper: sauceCandidate.mainPepper,
				imageUrl: `${process.env.SERVER_HOST}:${process.env.SERVER_PORT}/${req.file.path.replace('\\', '/')}`,
				heat: sauceCandidate.heat,
				likes: 0,
				dislikes: 0,
				usersLiked: [],
				usersDisliked: []
			});
			await sauce.save();
			res.status(201).json({
				message: `La sauce a été créé dans la base de données`
			});
			//Close connection to database
			sessionDBDisconnect(sessionDB);
		} else {
			res.status(403).json({
				message: `Impossible de créer la sauce : le nom, le fabricant, la description, le piment principal et la chaleur sont obligatoires.`
			});
		}
	} else {
		res.status(401).json({
			message: `Utilisateur non-autorisé`
		});
	};
};


/**********************************************************************
****************   Launching the main function    *********************
**********************************************************************/
main().catch(err => console.log(err));