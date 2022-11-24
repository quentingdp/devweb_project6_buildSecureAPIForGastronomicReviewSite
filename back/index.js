//Import of required modules in this page
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import express from 'express';

//main function
const main = async () => {
	//Activating environment variables management
	dotenv.config();
	//Defining web server and its routes for API
	const webServer = express();
	webServer.get('/', standardAnswer);
	webServer.get('/dbtest', standardDatabaseInfo);
	//Opening web server on defined port
	webServer.listen(process.env.SERVER_PORT);
	console.log(`Serveur web démarré : Connectez-vous sur http://localhost:${process.env.SERVER_PORT}/ pour le contacter`);
};

//Open connection to database
const sessionDBConnect = async () => {
	try {
		return mongoose.connect(`mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.MONGO_DB_CLUSTERNAME}.3t7ius9.mongodb.net/${DB_NAME}?retryWrites=true&w=majority`);
	} catch (e) {
		throw new Error(`Connexion impossible à la base de données: ${e.message}`);
	}
};

//Close connection to database
const sessionDBDisconnect = async (sessionDB) => {
	await sessionDB.disconnect();
};

//Provide standard answer hello world + details of the input request
const standardAnswer = (req, res) => {
	res.send('Hello World' + req);
};

//Provide standard information coming from the database
const standardDatabaseInfo = async (req, res) => {
	//Open connection to database
	const sessionDB = await sessionDBConnect();
	const testSchema = mongoose.Schema({
		name: String
	});
	const testModel = mongoose.model('Modeledansladb', testSchema);
	const silence = new testModel({ name: 'Silence' });
	await silence.save();
	const monsieur = new testModel({ name: 'On met ce quon veut' });
	await monsieur.save();
	res.send(silence.name);
	//Close connection to database
	sessionDBDisconnect(sessionDB);
};

main().catch(err => console.log(err));