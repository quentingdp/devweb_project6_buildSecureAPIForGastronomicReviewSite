//Import of required modules in this page
import { config } from 'dotenv'
import express from 'express'
import cors from 'cors'

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