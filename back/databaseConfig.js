//Import of required modules in this page
import { config } from 'dotenv'
import { connect } from 'mongoose'

//Activating environment variables management
config()

//Connexion to the database
const mongooseConnect = connect(`mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.MONGO_DB_CLUSTERNAME}.3t7ius9.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`,
	{
		useNewUrlParser: true,
		useUnifiedTopology: true
	})

export default mongooseConnect