export class CustomError extends Error {
	constructor(errorMessage) {
		super()
		this.name = this.constructor.name
		this.message = errorMessage
		switch (this.constructor.name) {
			case 'UserError':
				this.statusCode = 404
				break
			case 'SauceError':
				this.statusCode = 404
				break
			case 'RequestError':
				this.statusCode = 400
				break
			case 'AuthorizationError':
				this.statusCode = 403
				break
			case 'AuthenticationError':
				this.statusCode = 401
				break
			case 'MulterError':
				this.statusCode = 500
				break
			case 'DataConsistencyError':
				this.statusCode = 500
				break
			default:
				//We should never reach this case, as it means the error is not declared
				//If an error is thrown by another module, it won't be managed by this class
				console.error('Ce cas ne devrait pas se produire: merci de corriger la logique du back')
				this.statusCode = 500
		}
	}
}

export class UserError extends CustomError { }
export class SauceError extends CustomError { }
export class RequestError extends CustomError { }
export class AuthorizationError extends CustomError { }
export class AuthenticationError extends CustomError { }
export class MulterError extends CustomError { }
export class DataConsistencyError extends CustomError { }