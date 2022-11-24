//Import of required modules in this page
import dotenv from 'dotenv';
import mongoose from 'mongoose';
//import express from 'express';

//Activating environment variables management
dotenv.config();

//TESTS......
console.log(process.env.DB_USERNAME);
main().catch(err => console.log(err));

async function main() {
	//Open connection to database
	const sessionDB = await mongoose.connect(`mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.MONGO_DB_CLUSTERNAME}.3t7ius9.mongodb.net/?retryWrites=true&w=majority`);
	const kittySchema = new mongoose.Schema({
		name: String
	});
	const Kitten = mongoose.model('Kitten', kittySchema);
	const silence = new Kitten({ name: 'Silence' });
	console.log(silence.name);
	//Close connection to database
	await sessionDB.disconnect();
}