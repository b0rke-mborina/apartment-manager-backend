import mongo from "mongodb";
import connect from "./db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// add index to database collection
(async () => {
	let db = await connect();
	await db.collection("users").createIndex({ email: 1 }, { unique: true });
})();

export default {
	// registers user
	async registerUser(userData) {
		// connect to database and create document for save (with encrypted password)
		let db = await connect();
		let doc = {
			email: userData.email,
			password: await bcrypt.hash(userData.password, 8),
			firstName: userData.firstName,
			lastName: userData.lastName,
		};
		// save user to database
		try {
			let result = await db.collection("users").insertOne(doc);
			if (result && result.insertedId) {
				return result.insertedId;
			}
		} catch (error) {
			if (error.code == 11000) {
				return null;
			}
		}
	},
	// logs in user
	async loginUser(email, password) {
		// connect to database and find user in database
		let db = await connect();
		let user = await db.collection("users").findOne({ email: email });
		// compare information from database and received user information
		if (user && user.password && (await bcrypt.compare(password, user.password))) {
			delete user.password;
			// issue a token
			let token = jwt.sign(user, process.env.JWT_SECRET, {
				algorithm: "HS512",
				expiresIn: "1 week", // login time timeout
			});
			// return token (and email) to user
			return {
				token,
				_id: user._id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName
			};
    	} else {
			return null;
		}
	},
	// verifies / authorizes user (checks if user bears a correct token)
	verify(req, res, next) {
		try {
			// authorization data
			let authorization = req.headers.authorization.split(" ");
			let type = authorization[0];
			let token = authorization[1];
			// make sure token type is bearer and that token is correct
			if (type !== "Bearer") {
				res.status(401).json({ status: "Not bearer." });
				return false;
			} else {
				req.jwt = jwt.verify(token, process.env.JWT_SECRET);
				// continue current execution
				return next();
			}
		} catch (error) {
			// return unauthorized if error occurs
			return res.status(401).json();
		}
	},
};
