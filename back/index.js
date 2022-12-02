//Import of required modules in this page
import { config } from 'dotenv'
import mongoose from 'mongoose'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import multer from 'multer'
import { unlink } from 'node:fs'

//Import internal dependancies
import databaseConfig from './databaseConfig.js'
import auth_router from './routes/auth.js'
import sauces_router from './routes/sauce.js'

//Activating environment variables management
config()

//Initialization of web server + all its properties
const webServer = express()
webServer.use(express.json())
webServer.use(cors({
	"origin": "*",
	"methods": "GET,PUT,POST,DELETE",
	"preflightContinue": false,
	"optionsSuccessStatus": 204
}))
webServer.use(express.urlencoded({ extended: true }))
webServer.use('/uploads', express.static('./uploads'))

//Defining routes
webServer.use('/api/auth', auth_router)
webServer.use('/api/sauces', sauces_router)

//Default : not implemented routes
webServer.get('*', (req, res) => res.status(501).send("Not implemented"))
webServer.post('*', (req, res) => res.status(501).send("Not implemented"))
webServer.put('*', (req, res) => res.status(501).send("Not implemented"))
webServer.delete('*', (req, res) => res.status(501).send("Not implemented"))

//Connects the MongoDB database, then open the web server if successfull
databaseConfig
	.then(() => console.log('La connexion à MongoDB fonctionne.'))
	.then(() => {
		webServer.listen(process.env.SERVER_PORT, () => {
			console.log(`Serveur web démarré : Connectez-vous sur http://localhost:${process.env.SERVER_PORT}/ pour le contacter`)
		})
	})
	.catch((err) => console.error(`Impossible de se connecter à la MongoDB : ${err}`))

//OLD MAIN FUNCTION!!! (+ all following in the file)
////Activating environment variables management
//dotenv.config();
//openWebServer();


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
	webServer.get('/api/sauces/[a-f0-9]+/', apiGetOneSauce);
	webServer.post('/api/sauces', upload.single("image"), apiPostNewSauce);
	webServer.put('/api/sauces/[a-f0-9]+/', upload.single("image"), apiUpdateOneSauce);
	webServer.delete('/api/sauces/[a-f0-9]+/', apiDeleteOneSauce);
	webServer.post('/api/sauces/[a-f0-9]+/like/', apiLikeSauce);
	/*
	webServer.get('/*', return404);
	webServer.post('/*', return404);
	webServer.put('/*', return404);
	webServer.delete('/*', return404);
	*/
	webServer.listen(process.env.SERVER_PORT);
	console.log(`Serveur web démarré : Connectez-vous sur http://localhost:${process.env.SERVER_PORT}/ pour le contacter`);
};

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
 * Testing if the input json has all required properties to update a like
 * @param {string} likeCandidate Parameter json-formatted that is a candidate to hold all like properties
 * @returns {boolean}
 */
const isCorrectInputLike = (likeCandidate) => {
	return Object.hasOwn(likeCandidate, 'userId') && Object.hasOwn(likeCandidate, 'like');
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
 * This function deletes the file available in provided URL
 * @param {string} fileUrl URL of the file to delete
 */
const deleteFile = async (fileUrl) => {
	//Extracting only the local part of the URL
	const localFileUrl = fileUrl.split('/').slice(3).join('/');
	unlink(localFileUrl, (err) => {
		if (err) { console.error(err); };
	});
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
 * Get property of one sauce given in parameter
 * @param {stream.Readable} req 
 * @param {stream.Writable} res 
 */
const apiGetOneSauce = async (req, res) => {
	if (isAuthorized(req.headers)) {
		//Extracting the id of the sauce from the URL
		const sauceId = req.url.split('/').slice(-1)[0];
		//Open connection to database
		const sessionDB = await sessionDBConnect();
		const sauceSchema = schemaDefinitionSauce();
		const sauceModel = sessionDB.model('sauce', sauceSchema);
		//Try to get the sauce from the database, in case the query is invalid
		try {
			const thisSauce = await sauceModel.find({ "_id": sauceId });
			res.status(200).send(thisSauce[0]);
		} catch (e) {
			res.status(404).json({ message: "La sauce demandée n'existe pas." })
		};
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
		};
	} else {
		res.status(401).json({
			message: `Utilisateur non-autorisé`
		});
	};
};
/**
 * Updates the sauce whose id is given in parameter
 * @param {stream.Readable} req 
 * @param {stream.Writable} res 
 */
const apiUpdateOneSauce = async (req, res) => {
	if (isAuthorized(req.headers)) {
		//Extracting the id of the sauce from the URL
		const sauceId = req.url.split('/').slice(-1)[0];
		//Open connection to database
		const sessionDB = await sessionDBConnect();
		const sauceSchema = schemaDefinitionSauce();
		const sauceModel = sessionDB.model('sauce', sauceSchema);
		//Try to get the sauce from the database, in case the query is invalid. Then, we update it
		try {
			const thisSauce = await sauceModel.find({ "_id": sauceId });
			if (thisSauce[0].userId === getUserIdConnected(req.headers)) {
				//We could have 2 different inputs : we split the cases either we receive an "application/json" body (without image) or a "multipart/form-data" (with image)
				if (req.headers["content-type"] === "application/json") {
					const sauceCandidate = req.body;
					await sauceModel.updateMany({ "_id": sauceId }, {
						name: sauceCandidate.name,
						manufacturer: sauceCandidate.manufacturer,
						description: sauceCandidate.description,
						mainPepper: sauceCandidate.mainPepper,
						heat: sauceCandidate.heat
					});
					res.status(200).json({ message: `La sauce ${sauceId} a été mise à jour.` });
				} else {
					const sauceCandidate = JSON.parse(req.body.sauce);
					await deleteFile(thisSauce[0].imageUrl);
					await sauceModel.updateMany({ "_id": sauceId }, {
						name: sauceCandidate.name,
						manufacturer: sauceCandidate.manufacturer,
						description: sauceCandidate.description,
						mainPepper: sauceCandidate.mainPepper,
						imageUrl: `${process.env.SERVER_HOST}:${process.env.SERVER_PORT}/${req.file.path.replace('\\', '/')}`,
						heat: sauceCandidate.heat
					});
					res.status(200).json({ message: `La sauce ${sauceId} a été mise à jour.` });
				};
			} else {
				res.status(403).json({ message: "L'utilisateur connecté n'a pas le droit d'effectuer l'opération demandée" });
			};
		} catch (e) {
			res.status(400).json({ message: "Erreur dans la mise à jour de la sauce." });
		};
		//Close connection to database
		sessionDBDisconnect(sessionDB);
	} else {
		res.status(401).json({
			message: `Utilisateur non-autorisé`
		});
	};
};
/**
 * Deletes the sauce whose id is given in parameter from the database
 * @param {stream.Readable} req 
 * @param {stream.Writable} res 
 */
const apiDeleteOneSauce = async (req, res) => {
	if (isAuthorized(req.headers)) {
		//Extracting the id of the sauce from the URL
		const sauceId = req.url.split('/').slice(-1)[0];
		//Open connection to database
		const sessionDB = await sessionDBConnect();
		const sauceSchema = schemaDefinitionSauce();
		const sauceModel = sessionDB.model('sauce', sauceSchema);
		//Try to get the sauce from the database, in case the query is invalid. Then, we delete it
		try {
			const thisSauce = await sauceModel.find({ "_id": sauceId });
			if (thisSauce[0].userId === getUserIdConnected(req.headers)) {
				await deleteFile(thisSauce[0].imageUrl);
				await sauceModel.deleteOne({ "_id": sauceId });
				res.status(200).json({ message: `La sauce ${sauceId} a été supprimée de la base de données.` });
			} else {
				res.status(403).json({ message: "L'utilisateur connecté n'a pas le droit d'effectuer l'opération demandée" });
			};
		} catch (e) {
			res.status(404).json({ message: "La sauce demandée n'existe pas." });
		};
		//Close connection to database
		sessionDBDisconnect(sessionDB);
	} else {
		res.status(401).json({
			message: `Utilisateur non-autorisé`
		});
	};
};
/**
 * Manages the like of the connected user to the sauce whose id is given in parameter
 * @param {stream.Readable} req 
 * @param {stream.Writable} res 
 */
const apiLikeSauce = async (req, res) => {
	if (isAuthorized(req.headers)) {
		//Extracting the id of the sauce from the URL
		const sauceId = req.url.split('/').slice(-2)[0];
		//Open connection to database
		const sessionDB = await sessionDBConnect();
		const sauceSchema = schemaDefinitionSauce();
		const sauceModel = sessionDB.model('sauce', sauceSchema);
		//Try to get the sauce from the database, in case the query is invalid. Then, we update the like
		try {
			const thisSauce = await sauceModel.find({ "_id": sauceId });
			const { likes: currentLikes, dislikes: currentDislikes, usersLiked: newUsersLiked, usersDisliked: newUsersDisliked } = thisSauce[0];
			if (isCorrectInputLike(req.body)) {
				const { userId: userIdCandidate, like } = req.body;
				const userId = getUserIdConnected(req.headers);
				if (userId === userIdCandidate) {
					//Extracts information about the current like status of the user on this sauce
					//No control is done on potentiel corruption, i.e. we consider that at least one of the 2 values in these variables is -1
					const indexInLike = newUsersLiked.findIndex((element) => element === userId);
					const indexInDislike = newUsersDisliked.findIndex((element) => element === userId);
					//Updating the like. We check the conditions depending of the like provided, and the status of the like before the api calling
					switch (like) {
						case 1: {
							if (indexInDislike !== -1) {
								newUsersLiked.push(userId);
								newUsersDisliked.splice(indexInDislike, 1);
								await sauceModel.updateMany({ "_id": sauceId }, {
									likes: currentLikes + 1,
									dislikes: currentDislikes - 1,
									usersLiked: newUsersLiked,
									usersDisliked: newUsersDisliked
								});
							} else if (indexInLike === -1) {
								newUsersLiked.push(userId);
								await sauceModel.updateMany({ "_id": sauceId }, {
									likes: currentLikes + 1,
									usersLiked: newUsersLiked
								});
							};
							res.status(200).json({ message: `Les likes sur la sauce ${sauceId} ont été mis à jour.` });
							break;
						};
						case 0: {
							if (indexInLike !== -1) {
								newUsersLiked.splice(indexInLike, 1);
								await sauceModel.updateMany({ "_id": sauceId }, {
									likes: currentLikes - 1,
									usersLiked: newUsersLiked
								});
							} else if (indexInDislike !== -1) {
								newUsersDisliked.splice(indexInDislike, 1);
								await sauceModel.updateMany({ "_id": sauceId }, {
									dislikes: currentDislikes - 1,
									usersDisliked: newUsersDisliked
								});
							};
							res.status(200).json({ message: `Les likes sur la sauce ${sauceId} ont été mis à jour.` });
							break;
						};
						case -1: {
							if (indexInLike !== -1) {
								newUsersLiked.splice(indexInLike, 1);
								newUsersDisliked.push(userId);
								await sauceModel.updateMany({ "_id": sauceId }, {
									likes: currentLikes - 1,
									dislikes: currentDislikes + 1,
									usersLiked: newUsersLiked,
									usersDisliked: newUsersDisliked
								});
							} else if (indexInDislike === -1) {
								newUsersDisliked.push(userId);
								await sauceModel.updateMany({ "_id": sauceId }, {
									dislikes: currentDislikes + 1,
									usersDisliked: newUsersDisliked
								});
							};
							res.status(200).json({ message: `Les likes sur la sauce ${sauceId} ont été mis à jour.` });
							break;
						};
						default: {
							res.status(403).json({
								message: `Impossible de mettre à jour le like : la valeur du like n'est pas conforme.`
							});
						};
					};
				} else {
					res.status(403).json({
						message: `Vous ne pouvez mettre à jour les likes d'un autre utilisateur.`
					});
				};
			} else {
				res.status(403).json({
					message: `Impossible de mettre à jour le like : le UserId et le like sont obligatoires.`
				});
			};
		} catch (e) {
			res.status(400).json({ message: "Erreur dans la mise à jour de la sauce." });
		};
		//Close connection to database
		sessionDBDisconnect(sessionDB);
	} else {
		res.status(401).json({
			message: `Utilisateur non-autorisé`
		});
	};
};