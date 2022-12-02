export class CustomError extends Error {
	constructor(errorMessage) {
		super()
		this.name = this.constructor.name
		this.message = errorMessage
		switch (this.constructor.name) {
			case 'UserError':
				this.statusCode = 403
				break
			case 'RequestError':
				this.statusCode = 403
				break
			case 'AuthenticationError':
				this.statusCode = 401
				break
			default:
				this.statusCode = 500
			//We should never reach this case, as it means the error is not declared
			//If an error is thrown by another module, it won't be managed by this class
		}
	}
}

export class UserError extends CustomError { }
export class RequestError extends CustomError { }
export class AuthenticationError extends CustomError { }