import dotenv, { config } from "dotenv";
dotenv.config();

import mongo from 'mongodb';

let connection_string = process.env.CONNECTION_STRING;

let client = new mongo.MongoClient(connection_string, {
	useNewUrlParser: true,
	useUnifiedTopology: true
});

let db = null

function isConnected() {
	return !!client && !!client.topology && client.topology.isConnected();
}

export default async () => {
	if (!db || !isConnected()) {
		await client.connect();
		db = client.db("apartment-manager");
		// console.log("apartment-manager OK");
	}
	return db;
}
