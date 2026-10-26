export function validate(key, schema) {
  return async (req, _res, next) => {
    try {
      req.valid = req.valid || {};
      req.valid[key] = schema.parse(req[key]);
      next();
    } catch (error) {
      next(error);
    }
  };
}