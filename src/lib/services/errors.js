/**
 * Layered architecture — shared error type.
 * Services throw ServiceError for expected failures (bad input, not found,
 * AI outages). Route handlers (controllers) catch it and map it to an HTTP
 * response. Anything else becomes a generic 500.
 */
export class ServiceError extends Error {
    status;
    constructor(message, status = 500) {
        super(message);
        this.name = "ServiceError";
        this.status = status;
    }
}
