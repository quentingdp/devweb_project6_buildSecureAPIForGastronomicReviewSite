const jwtCheck = (req, res, next) => {
	return res.status(500).json({ message: 'Gestion des JWT non-implémentée' })
}

export default jwtCheck