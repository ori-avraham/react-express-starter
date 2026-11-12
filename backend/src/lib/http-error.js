// Throw one of these from a route handler to send an error response:
//
//   throw httpError(404, "Note not found.");
//   throw httpError(403, "Only managers can archive notes.");
//
// The onError middleware turns it into { message } with the given status.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function httpError(status, message) {
  return new HttpError(status, message);
}
