// An error with an HTTP status code. Throw it anywhere and the
// central error handler in index.js turns it into a JSON response.
export default class AppError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}
