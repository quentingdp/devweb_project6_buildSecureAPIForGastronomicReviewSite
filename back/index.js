//Import of required modules in this page
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import express from 'express';

//main function
const main = async () => {
	//Activating environment variables management
	dotenv.config();
	openWebServer();
};

//Function that opens the web server, defines API routes and listen on port given in environment
const openWebServer = () => {
	const webServer = express();
	//for tests only!!!!!!!
	webServer.get('/dbtest', standardDatabaseInfo);

	webServer.post('/api/auth/signup', routeTester);
	webServer.post('/api/auth/login', routeTester);
	webServer.get('/api/sauces', routeTester);
	webServer.get('/api/sauces/[a-f0-9]+/', routeTester);
	webServer.post('/api/sauces', routeTester);
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

//TEST... to be sure the route exists, a basic function
const routeTester = (req, res) => {
	res.send("La route d'API existe");
}

//Open connection to database
const sessionDBConnect = async () => {
	try {
		return mongoose.createConnection(`mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.MONGO_DB_CLUSTERNAME}.3t7ius9.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`);
	} catch (e) {
		throw new Error(`Connexion impossible à la base de données: ${e.message}`);
	}
};
//Close connection to database
const sessionDBDisconnect = async (sessionDB) => {
	await sessionDB.close();
};
//Defining schemas to use in this project : for a sauce
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
//Defining schemas to use in this project : for a user
const schemaDefinitionUser = () => {
	return new mongoose.Schema({
		email: String,
		password: String
	});
};
//Default answer to return if the API route doesn't exist
/*
const return404 = (req, res) => {
	res.send('erreur 404');
};
*/
//TEST!!!!!! Provide standard information coming from the database
const standardDatabaseInfo = async (req, res) => {
	//Open connection to database
	const sessionDB = await sessionDBConnect();

	const sauceSchema = schemaDefinitionSauce();
	const userSchema = schemaDefinitionUser();
	const sauceModel = sessionDB.model('sauce', sauceSchema);
	const userModel = sessionDB.model('user', userSchema);
	const tempUser = new userModel({
		email: "email.jfdkmq@jfkdqm.com",
		password: "jkmqsfdkjnv565"
	});
	const tempSauce = new sauceModel({
		userId: "fjkdqml",
		name: "Sauce qui pique",
		manufacturer: "Heinz",
		description: "Cette sauce pique un max",
		mainPepper: "Baie de genièvre",
		imageUrl: "pipo.jpg",
		heat: 6,
		likes: 0,
		dislikes: 0
	});
	await tempUser.save();
	await tempSauce.save();
	//console.log(await sauceModel.find());
	//console.log(await userModel.find());
	res.send(await sauceModel.find());

	//Close connection to database
	sessionDBDisconnect(sessionDB);
};

/**********************************************************************
****************   Launching the main function    *********************
**********************************************************************/
main().catch(err => console.log(err));