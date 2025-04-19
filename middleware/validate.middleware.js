// middleware/validate.js
import validator from '../helpers/validate.js';

export const subscription = (req, res, next) => {
  const validationRule = {
    route_id: 'required|string',
    stop_id: 'required|string',
    times: 'array',
    active: 'boolean'
  };

  validator(req.body, validationRule, {}, (err, status) => {
    if (!status) {
      res.status(412).send({
        success: false,
        message: 'Validation failed',
        data: err
      });
    } else {
      next();
    }
  });
};

// Add other validation rules as needed
export default {
  subscription
};