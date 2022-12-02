//Import of required modules in this page
import { Schema, model } from 'mongoose'

const sauceSchema = Schema({
	userId: { type: String, required: true },
	name: { type: String, required: true },
	manufacturer: { type: String, required: true },
	description: { type: String, required: true },
	mainPepper: { type: String, required: true },
	imageUrl: { type: String, required: true },
	heat: { type: Number, required: true },
	likes: Number,
	dislikes: Number,
	usersLiked: [String],
	usersDisliked: [String]
})

export default model('sauce', sauceSchema)