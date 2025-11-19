// middlewares/optionalAuth.js
import jwt from "jsonwebtoken";

export default function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "0bd8bf735d86f36ca8c04f512508e89ca4cc1dbae2a07af0e28464238bdc8e1fcb6ab73f34bde2c4883ab84e487df2c478e04196696f76cb0bbf1e7e8f4be759"
      );
      req.user = decoded; // logged-in case
    } catch (err) {
      // invalid token → treat user as guest
    }
  }

  next();
}
