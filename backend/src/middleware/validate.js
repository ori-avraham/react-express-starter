// Checks req.body / req.query / req.params against a Zod schema.
// Valid data is stored in req.valid.body / req.valid.query / req.valid.params.
// Invalid data throws a ZodError, which onError answers with 400.
//
//   router.post("/", validate("body", createNoteBody), createNote);
export function validate(key, schema) {
  return (req, _res, next) => {
    req.valid = req.valid || {};
    req.valid[key] = schema.parse(req[key]);
    next();
  };
}
