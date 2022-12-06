//Import of required modules in this page
import multer from 'multer'

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, `./uploads/`)
	},
	filename: function (req, file, cb) {
		const uniqueSuffix = Date.now()
		const fileNameArray = file.originalname.split('.')
		fileNameArray.splice(fileNameArray.length - 1, 0, uniqueSuffix)
		cb(null, fileNameArray.join('.'))
	}
})

const upload = multer({ storage: storage })

export default upload.single("image")