// Request validation helper backed by zod.
// Usage: router.post('/', validate(reportCreateSchema), controller.createReport)
// On success, req.body is replaced with the parsed (and coerced) value.

const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return res.status(400).json({ error: 'Validation failed', details });
  }
  req[source] = result.data;
  return next();
};

module.exports = { validate };
