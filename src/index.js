import dotenv, { config } from "dotenv";
dotenv.config();

import express, { json, query } from 'express';
import cors from 'cors';
import mongo from 'mongodb';

import connect from './db.js';
import { AxiosServiceExchangeRates } from './services.js';
import storage from './storage.js';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());


// =============== default route or path ===============

// get data
app.get('/', (req, res) => {
	res.status(200).json({});
});



// =============== Users and authentication ===============


// route or path: /user/current

// get current user
app.get('/user/current', async (req, res) => {
	let db = await connect();
	res.send(storage.User[0]);
});



// =============== PrivateAccomodation ===============


// route or path: /privateaccomodations

// get all private accomodations with their addresses
app.get('/privateaccomodations', async (req, res) => {
	// generate selection and connect to database
	let selection = {};
	if (req.query.state === "occupied") selection["currentState"] = "OCCUPIED";
	else if (req.query.state === "available") selection["currentState"] = "AVAILABLE";
	else if (req.query.state === "pending") selection["currentState"] = "PENDING";
	// console.log(selection);
	let db = await connect();
	// get all documents from database collection and send it
	let cursor = await db.collection("privateaccomodations").find(selection);
	const limit = req.query.limit;
	if (limit && Number.isInteger(Number(limit)) && Number(limit) >= 0) {
		cursor = cursor.limit(Number(limit));
	}
	let results = await cursor.toArray();
	// get belonging addresses
	let accomodations = results.map(async accomodation => {
		let address = await db.collection("addresses").findOne({ _id: mongo.ObjectId(accomodation.location) });
		accomodation.location = address;
		// console.log(accomodation);
		return accomodation;
	});
	accomodations = await Promise.all(accomodations);
	res.status(200).json(accomodations);
});

// add / insert one private accomodation (and address if needed)
app.post('/privateaccomodations', async (req, res) => {
	// save data and connect to database
	let doc = req.body;
	console.log(doc);
	let db = await connect();
	// check data requirements fulfillment
	const allowedAttributes = ["name", "categoryStarNumber", "maxGuestNumber", "location",
										"lowestFloor", "floorsNumber", "hasYard", "currentState"];
	const allowedAddressAttributes = ["street", "houseNumber", "entranceNumber", "postalNumber", "city", "country"];
	const check = Boolean(
		doc.name && typeof doc.name === "string"
		&& doc.categoryStarNumber !== "" && doc.categoryStarNumber !== null && doc.categoryStarNumber !== undefined
			&& typeof doc.categoryStarNumber === "number"
		&& doc.maxGuestNumber !== "" && doc.maxGuestNumber !== null && doc.maxGuestNumber !== undefined
			&& typeof doc.maxGuestNumber === "number"
		&& doc.lowestFloor !== "" && doc.lowestFloor !== null && doc.lowestFloor !== undefined
			&& typeof doc.lowestFloor === "number"
		&& doc.floorsNumber !== "" && doc.floorsNumber !== null && doc.floorsNumber !== undefined
			&& typeof doc.floorsNumber === "number"
		&& doc.hasYard !== "" && doc.hasYard !== null && doc.hasYard !== undefined
			&& typeof doc.hasYard === "boolean"
		&& doc.currentState === "AVAILABLE"
		&& doc.location && typeof doc.location === "object"
		&& doc.location.street && typeof doc.location.street === "string"
		&& doc.location.houseNumber && typeof doc.location.houseNumber === "string"
		&& doc.location.entranceNumber && typeof doc.location.entranceNumber === "string"
		&& doc.location.postalNumber !== "" && doc.location.postalNumber !== null && doc.location.postalNumber !== undefined
			&& typeof doc.location.postalNumber === "number"
		&& doc.location.city && typeof doc.location.city === "string"
		&& doc.location.country && typeof doc.location.country === "string"
		&& Object.keys(doc).length === 8
		&& Object.keys(doc).every(attribute => allowedAttributes.includes(attribute))
		&& Object.keys(doc.location).length === 6
		&& Object.keys(doc.location).every(attribute => allowedAddressAttributes.includes(attribute))
	);
	if (check) {
		console.log("address OK");
		let addressInDb = await db.collection("addresses").findOne(doc.location);
		if (!addressInDb) {
			let result = await db.collection('addresses').insertOne(doc.location);
			if (result.insertedId !== null) {
				doc.location = result.insertedId;
			} else {
				res.status(501).json({
					status: 'Address creation failed.',
				});
			}
		} else {
			doc.location = addressInDb._id;
		}
		console.log("accomodation OK");
		doc.location = mongo.ObjectId(doc.location);
		// save document to database collection and give feedback
		let result = await db.collection('privateaccomodations').insertOne(doc);
		if (result.insertedId !== null) {
			res.status(201).json({
				status: 'Private accomodation creation successful.',
				_id: result.insertedId,
			});
		} else {
			res.status(501).json({
				status: 'Private accomodation creation failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});


// route or path: /privateaccomodation/:id

// get one private accomodation and its address
app.get('/privateaccomodation/:id', async (req, res) => {
	// save data and connect to database
	let privateAccomodationId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	if (privateAccomodationId && privateAccomodationId.match(/^[0-9a-fA-F]{24}$/)) {
		// get wanted document and subdocument from database collection and send it
		let privateAccomodation = await db.collection("privateaccomodations").findOne({ _id: mongo.ObjectId(privateAccomodationId) });
		console.log(privateAccomodation);
		let address = await db.collection("addresses").findOne({ _id: mongo.ObjectId(privateAccomodation.location) });
		privateAccomodation.location = address;
		// console.log(privateAccomodation);
		res.status(200).json(privateAccomodation);
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});

// delete one private accomodation (and its address if needed)
app.delete('/privateaccomodation/:id', async (req, res) => {
	// save data and connect to database
	let privateAccomodationId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment (if id is OK and there isn't any more accomodations on the same address)
	let accomodation = await db.collection("privateaccomodations").findOne({ _id: mongo.ObjectId(privateAccomodationId) });
	let cursorAccomodationsOnSameAddress = await db.collection("privateaccomodations")
		.find({ location: mongo.ObjectId(accomodation.location) });
	let accomodationsOnSameAddress = await cursorAccomodationsOnSameAddress.toArray();
	const check = Boolean(
		privateAccomodationId && privateAccomodationId.match(/^[0-9a-fA-F]{24}$/)
	);
	if (check) {
		// delete address if needed
		if (accomodationsOnSameAddress.length == 1) {
			let addressResult = await db.collection('addresses').deleteOne({ _id: accomodation.location });
			if (addressResult.deletedCount != 1) {
				res.status(501).json({
					status: 'Deletion failed.',
				});
			}
		}
		// delete document from database collection and give feedback
		let result = await db.collection('privateaccomodations').deleteOne({ _id: mongo.ObjectId(privateAccomodationId) });
		if (result.deletedCount == 1) {
			res.status(200).json({
				status: 'Private accomodation deletion successful.'
			});
		} else {
			res.status(501).json({
				status: 'Private accomodation deletion failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});

// update one private accomodation using patch
app.patch('/privateaccomodation/:id', async (req, res) => {
	// save data and connect to database
	let doc = req.body;
	delete doc._id;
	// console.log(doc);
	let privateAccomodationId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	const allowedAttributes = ["name", "categoryStarNumber", "maxGuestNumber", "location",
										"lowestFloor", "floorsNumber", "hasYard", "currentState"];
	const check = Boolean(
		privateAccomodationId && privateAccomodationId.match(/^[0-9a-fA-F]{24}$/)
		&& (
			(doc.name && typeof doc.name === "string")
			|| (item.categoryStarNumber !== "" && item.categoryStarNumber !== null && item.categoryStarNumber !== undefined
				&& typeof doc.categoryStarNumber === "number")
			|| (item.maxGuestNumber !== "" && item.maxGuestNumber !== null && item.maxGuestNumber !== undefined && typeof doc.maxGuestNumber === "number")
			|| (doc.location && doc.location.match(/^[0-9a-fA-F]{24}$/)) //  || !doc.location
			|| (item.lowestFloor !== "" && item.lowestFloor !== null && item.lowestFloor !== undefined
				&& typeof doc.lowestFloor === "number")
			|| (item.floorsNumber !== "" && item.floorsNumber !== null && item.floorsNumber !== undefined
				&& typeof doc.floorsNumber === "number")
			|| (doc.hasYard !== "" && doc.hasYard !== null && doc.hasYard !== undefined
				&& typeof doc.hasYard === "boolean")
			|| (doc.currentState && typeof doc.currentState === "string")
		)
		&& Object.keys(doc).length <= 8
		&& Object.keys(doc).every(attribute => allowedAttributes.includes(attribute))
		&& Object.values(doc).every(value => value !== "" && value !== null && value !== undefined)
	);
	if (check) {
		doc.location = mongo.ObjectId(doc.location);
		// update document in database collection and give feedback
		let result = await db.collection('privateaccomodations').updateOne(
			{ _id: mongo.ObjectId(privateAccomodationId) },
			{ $set: doc }
		);
		if (result.matchedCount == 1 && result.modifiedCount == 1) {
			res.status(200).json({
				status: 'Private accomodation updated successfully',
				id: result.modifiedId,
			});
		} else {
			res.status(501).json({
				status: 'Private accomodation update failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});

// update one private accomodation using put
app.put('/privateaccomodation/:id', async (req, res) => {
	// save data and connect to database
	let doc = req.body;
	delete doc._id;
	// console.log(doc);
	let privateAccomodationId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	const allowedAttributes = ["name", "categoryStarNumber", "maxGuestNumber", "location",
										"lowestFloor", "floorsNumber", "hasYard", "currentState"];
	const check = Boolean(
		privateAccomodationId && privateAccomodationId.match(/^[0-9a-fA-F]{24}$/)
		&& doc.name && typeof doc.name === "string"
		&& item.categoryStarNumber !== "" && item.categoryStarNumber !== null && item.categoryStarNumber !== undefined
			&& typeof doc.categoryStarNumber === "number"
		&& item.maxGuestNumber !== "" && item.maxGuestNumber !== null && item.maxGuestNumber !== undefined
			&& typeof doc.maxGuestNumber === "number"
		&& doc.location && doc.location.match(/^[0-9a-fA-F]{24}$/)
		&& item.lowestFloor !== "" && item.lowestFloor !== null && item.lowestFloor !== undefined
			&& typeof doc.lowestFloor === "number"
		&& item.floorsNumber !== "" && item.floorsNumber !== null && item.floorsNumber !== undefined
			&& typeof doc.floorsNumber === "number"
		&& doc.hasYard !== "" && doc.hasYard !== null && doc.hasYard !== undefined && typeof doc.hasYard === "boolean"
		&& doc.currentState && typeof doc.currentState === "string"
		&& Object.keys(doc).length === 8
		&& Object.keys(doc).every(attribute => allowedAttributes.includes(attribute))
	);
	if (check) {
		doc.location = mongo.ObjectId(doc.location);
		// update document in database collection and give feedback
		let result = await db.collection('privateaccomodations').updateOne(
			{ _id: mongo.ObjectId(privateAccomodationId) },
			{ $set: doc }
		);
		if (result.matchedCount == 1 && result.modifiedCount == 1) {
			res.status(200).json({
				status: 'Private accomodation updated successfully',
				id: result.modifiedId,
			});
		} else {
			res.status(501).json({
				status: 'Private accomodation update failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});


// route or path: /privateaccomodation/:id/address

// get address of one private accomodation
app.get('/privateaccomodation/:id/address', async (req, res) => {
	// save data and connect to database
	let privateAccomodationId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	if (privateAccomodationId && privateAccomodationId.match(/^[0-9a-fA-F]{24}$/)) {
		// get wanted document and subdocument from database collection and send it
		let privateAccomodation = await db.collection("privateaccomodations").findOne({ _id: mongo.ObjectId(privateAccomodationId) });
		// console.log(privateAccomodation);
		if (privateAccomodation && privateAccomodation.location) {
			let address = await db.collection("addresses").findOne({ _id: mongo.ObjectId(privateAccomodation.location) });
			// console.log(address);
			res.status(200).json(address);
		} else {
			res.status(404).json({
				status: 'Address not found.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});



// =============== Address ===============


// route or path: /addresses

// get all addresses
app.get('/addresses', async (req, res) => {
	let selection = {};
	if(req.query.street) selection["street"] = req.query.street;
	// console.log(req.query.street);
	if(req.query.houseNumber) selection["houseNumber"] = req.query.houseNumber;
	// console.log(req.query.houseNumber);
	if(req.query.entranceNumber) selection["entranceNumber"] = req.query.entranceNumber;
	// console.log(req.query.entranceNumber);
	if(req.query.postalNumber) selection["postalNumber"] = Number(req.query.postalNumber);
	// console.log(Number(req.query.postalNumber));
	if(req.query.city) selection["city"] = req.query.city;
	// console.log(req.query.city);
	if(req.query.country) selection["country"] = req.query.country;
	// console.log(req.query.country);
	console.log(selection);
	let db = await connect();
	let cursor = await db.collection("addresses").find(selection);
	let results = await cursor.toArray();
	res.json(results);
});

// add / insert one address
app.post('/addresses', async (req, res) => {
	// save data and connect to database
	let doc = req.body;
	// console.log(doc);
	let db = await connect();
	// check data requirements fulfillment
	const allowedAttributes = ["street", "houseNumber", "entranceNumber", "postalNumber", "city", "country"];
	const check = Boolean(
		doc.street && typeof doc.street === "string"
		&& doc.houseNumber && typeof doc.houseNumber === "string"
		&& doc.entranceNumber && typeof doc.entranceNumber === "string"
		&& doc.postalNumber !== "" && doc.postalNumber !== null && doc.postalNumber !== undefined && typeof doc.postalNumber === "number"
		&& doc.city && typeof doc.city === "string"
		&& doc.country && typeof doc.country === "string"
		&& Object.keys(doc).length === 6
		&& Object.keys(doc).every(attribute => allowedAttributes.includes(attribute))
	);
	if (check) {
		// save document to database collection and give feedback
		let result = await db.collection('addresses').insertOne(doc);
		if (result.insertedId !== null) {
			res.status(201).json({
				status: 'Address creation successful.',
				_id: result.insertedId,
			});
		} else {
			res.status(501).json({
				status: 'Address creation failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});


// route or path: /address/:id

// get one address
app.get('/address/:id', async (req, res) => {
	// save data and connect to database
	let addressId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	if (addressId && addressId.match(/^[0-9a-fA-F]{24}$/)) {
		// get wanted document from database collection and send it
		let address = await db.collection("addresses").findOne({ _id: mongo.ObjectId(addressId) });
		// console.log(address);
		res.status(200).json(address);
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});

// delete one address
app.delete('/address/:id', async (req, res) => {
	// save data and connect to database
	let addressId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	const check = Boolean(
		addressId && addressId.match(/^[0-9a-fA-F]{24}$/)
	);
	if (check) {
		// delete document from database collection and give feedback
		let result = await db.collection('addresses').deleteOne({ _id: mongo.ObjectId(addressId) });
		if (result.deletedCount == 1) {
			res.status(200).json({
				status: 'To-do list deletion successful.'
			});
		} else {
			res.status(501).json({
				status: 'To-do list deletion failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});

// update one address using patch
app.patch('/address/:id', async (req, res) => {	
	// save and modify data, connect to database
	let doc = req.body;
	delete doc._id;
	let addressId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	const allowedAttributes = ["street", "houseNumber", "entranceNumber", "postalNumber", "city", "country"];
	const check = Boolean(
		addressId && addressId.match(/^[0-9a-fA-F]{24}$/)
		&& (
			(doc.street && typeof doc.street === "string")
			|| (doc.houseNumber && typeof doc.houseNumber === "string")
			|| (doc.entranceNumber && typeof doc.entranceNumber === "string")
			|| (item.postalNumber !== "" && item.postalNumber !== null && item.postalNumber !== undefined && typeof doc.postalNumber === "number")
			|| (doc.city && typeof doc.city === "string")
			|| (doc.country && typeof doc.country === "string")
		)
		&& Object.keys(doc).length <= 6
		&& Object.keys(doc).every(attribute => allowedAttributes.includes(attribute))
		&& Object.values(doc).every(value => value !== "" && value !== null && value !== undefined)
	);
	if (check) {
		// update document in database collection and give feedback
		let result = await db.collection('addresses').updateOne(
			{ _id: mongo.ObjectId(addressId) },
			{ $set: doc }
		);
		if (result.matchedCount == 1 && result.modifiedCount == 1) {
			res.status(200).json({
				status: 'Address updated successfully',
				id: result.modifiedId,
			});
		} else {
			res.status(501).json({
				status: 'Address update failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});

// update one address using put
app.put('/address/:id', async (req, res) => {		
	// save and modify data, connect to database
	let doc = req.body;
	delete doc._id;
	let addressId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	const allowedAttributes = ["street", "houseNumber", "entranceNumber", "postalNumber", "city", "country"];
	const check = Boolean(
		addressId && addressId.match(/^[0-9a-fA-F]{24}$/)
		&& doc.street && typeof doc.street === "string"
		&& doc.houseNumber && typeof doc.houseNumber === "string"
		&& doc.entranceNumber && typeof doc.entranceNumber === "string"
		&& item.postalNumber !== "" && item.postalNumber !== null && item.postalNumber !== undefined && typeof doc.postalNumber === "number"
		&& doc.city && typeof doc.city === "string"
		&& doc.country && typeof doc.country === "string"
		&& Object.keys(doc).length === 6
		&& Object.keys(doc).every(attribute => allowedAttributes.includes(attribute))
	);
	if (check) {
		// update document in database collection and give feedback
		let result = await db.collection('addresses').updateOne(
			{ _id: mongo.ObjectId(addressId) },
			{ $set: doc }
		);
		if (result.matchedCount == 1 && result.modifiedCount == 1) {
			res.status(200).json({
				status: 'Address updated successfully',
				id: result.modifiedId,
			});
		} else {
			res.status(501).json({
				status: 'Address update failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});


// route or path: /address/:id/privateaccomodations

// get all private accomodations on one address
app.get('/address/:id/privateaccomodations', async (req, res) => {
	// save data and connect to database
	let addressId = req.params.id;
	let db = await connect();
	// get all documents from database collection and send it
	let cursor = await db.collection("privateaccomodations").find({ location: mongo.ObjectId(addressId) });
	let results = await cursor.toArray();
	res.status(200).json(results);
});



// =============== Reservation ===============


// route or path: /reservations

// get all reservations
app.get('/reservations', async (req, res) => {
	// connect to database
	let db = await connect();
	// generate aggregation options for reservations and their periods and main guests
	let aggregation = [
		{
			$lookup: {
				from: "periods",
				localField: "period",
				foreignField: "_id",
				as: 'period'
			}
		},
		{ $unwind: '$period' },
		{
			$lookup: {
				from: "guests",
				localField: "madeByGuest",
				foreignField: "_id",
				as: 'madeByGuest'
			}
		},
		{ $unwind: '$madeByGuest' }
	];
	// add filter for relevant reservations if requested
	if (req.query.relevant == "true") {
		aggregation.push({
			$match: {
				$or: [
					{ currentState: "INQUIRY" },
					{ currentState: "PENDING" },
					{ currentState: "CONFIRMED" }
				]
			}
		});
	}
	// add filter for future reservations if requested
	if (req.query.upcoming == "true") {
		const current = new Date();
		let year = current.getFullYear();
		let month = current.getMonth()+1;
		let day = current.getDate();
		if (month < 10) month = "0" + month;
		if (day < 10) month = "0" + day;
		const today = `${year}-${month}-${day}`;
		aggregation.push({ $match: { "period.start" : { $gte: today } } });
	}
	// get all reservations and their periods from database collections using aggregation
	// (sort if upcoming and limit if necessary)
	let cursor = await db.collection("reservations").aggregate(aggregation);
	if (req.query.upcoming == "true") cursor = cursor.sort({ "period.start": 1 })
	// apply limit to cursor if requested
	const limit = req.query.limit;
	if (limit && Number.isInteger(Number(limit)) && Number(limit) >= 0) {
		cursor = cursor.limit(Number(limit));
	}
	let reservations = await cursor.toArray();
	// send all documents and subdocuments found
	console.log(reservations);
	res.status(200).json(reservations);
});

// add / insert one reservation
app.post('/reservations', async (req, res) => {
	// save data and connect to database
	let doc = req.body;
	console.log(doc);
	let db = await connect();
	// set valueInEur
	if (doc.price.currency === "EUR") {
		doc.price.valueInEur = doc.price.value;
	} else {
		try {
			const currentValueInEur = await AxiosServiceExchangeRates.get(
				`/convert?to=EUR&from=${doc.price.currency}&amount=${doc.price.value}`,
				{
					redirect: 'follow',
					headers: {
						"apikey": process.env.API_LAYER_KEY,
					}
				}
			);
			console.log("currentValueInEur");
			console.log(currentValueInEur.data.result.toFixed(2));
			doc.price.valueInEur = Number(currentValueInEur.data.result.toFixed(2));
		} catch (error) {
			res.status(501).json({
				status: 'Reservation creation failed.',
			});
		}
	}
	// check data requirements fulfillment
	const allowedAttributes = ["period", "madeByGuest", "currentState", "price", "guests"];
	const allowedPeriodAttributes = ["name", "start", "end", "privateAccomodation"];
	const allowedPeriodAccomodationAttributes = ["name", "id"];
	const allowedPriceAttributes = ["value", "currency", "valueInEur"];
	const check = Boolean(
		doc.period && typeof doc.period === "object"
		&& doc.madeByGuest && typeof doc.madeByGuest === "string" && doc.madeByGuest.match(/^[0-9a-fA-F]{24}$/)
		&& doc.currentState && typeof doc.currentState === "string"
		&& doc.price && typeof doc.price === "object"
		&& doc.guests && typeof Array.isArray(doc.guests)
		&& doc.period.name && typeof doc.period.name === "string"
		&& doc.period.start && typeof doc.period.start === "string"
		&& doc.period.end && typeof doc.period.end === "string"
		&& doc.period.privateAccomodation && typeof doc.period.privateAccomodation === "object"
		&& doc.period.privateAccomodation.id && typeof doc.period.privateAccomodation.id === "string"
			&& doc.period.privateAccomodation.id.match(/^[0-9a-fA-F]{24}$/)
		&& doc.period.privateAccomodation.name && typeof doc.period.privateAccomodation.name === "string"
		&& doc.price.value !== "" && doc.price.value !== null && doc.price.value !== undefined
			&& typeof doc.price.value === "number"
		&& doc.price.currency && typeof doc.price.currency === "string"
		&& doc.price.valueInEur !== "" && doc.price.valueInEur !== null && doc.price.valueInEur !== undefined
			&& typeof doc.price.valueInEur === "number"
		&& doc.guests.every(guest => guest && typeof guest === "string" && guest.match(/^[0-9a-fA-F]{24}$/))
		&& Object.keys(doc).length === 5
		&& Object.keys(doc).every(attribute => allowedAttributes.includes(attribute))
		&& Object.keys(doc.period).length === 4
		&& Object.keys(doc.period).every(attribute => allowedPeriodAttributes.includes(attribute))
		&& Object.keys(doc.period.privateAccomodation).length === 2
		&& Object.keys(doc.period.privateAccomodation).every(attribute => allowedPeriodAccomodationAttributes.includes(attribute))
		&& Object.keys(doc.price).length === 3
		&& Object.keys(doc.price).every(attribute => allowedPriceAttributes.includes(attribute))
	);
	if (check) {
		doc.period.privateAccomodation.id = mongo.ObjectId(doc.period.privateAccomodation.id);
		let resultPeriod = await db.collection('periods').insertOne(doc.period);
		if (resultPeriod.insertedId !== null) {
			doc.period = resultPeriod.insertedId;
		} else {
			res.status(501).json({
				status: 'Period creation failed.',
			});
		}
		doc.period = mongo.ObjectId(doc.period);
		doc.madeByGuest = mongo.ObjectId(doc.madeByGuest);
		doc.guests = doc.guests.map(guest => mongo.ObjectId(guest));
		// save document to database collection and give feedback
		let result = await db.collection('reservations').insertOne(doc);
		if (result.insertedId !== null) {
			res.status(201).json({
				status: 'Reservation creation successful.',
				_id: result.insertedId,
			});
		} else {
			res.status(501).json({
				status: 'Reservation creation failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});


// route or path: /reservation/:id

// get one reservation
app.get('/reservation/:id', async (req, res) => {
	// save data and connect to database
	let reservationId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	if (reservationId && reservationId.match(/^[0-9a-fA-F]{24}$/)) {
		// get wanted document and its subdocuments from database collections
		let cursor = await db.collection("reservations").aggregate([
			{
				$match: { _id: mongo.ObjectId(reservationId) }
			},
			{ $unwind: '$period' },
			{
				$lookup: {
					from: "periods",
					localField: "period",
					foreignField: "_id",
					as: 'period'
				}
			},
			{ $unwind: '$period' },
			{
				$lookup: {
					from: "guests",
					localField: "madeByGuest",
					foreignField: "_id",
					as: 'madeByGuest'
				}
			},
			{ $unwind: '$madeByGuest' },
			{
				$lookup: {
					from: "guests",
					localField: "guests",
					foreignField: "_id",
					as: 'guests'
				}
			}
		]);
		let reservation = await cursor.toArray();
		// console.log(reservation);
		// send retrieved data
		if (reservation.length === 0) res.status(200).json(null);
		else res.status(200).json(reservation[0]);
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});

// delete one reservation
app.delete('/reservation/:id', async (req, res) => {
	// save data and connect to database
	let reservationId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	const check = Boolean(
		reservationId && reservationId.match(/^[0-9a-fA-F]{24}$/)
	);
	if (check) {
		// delete belonging period
		let reservation = await db.collection('reservations').findOne({ _id: mongo.ObjectId(reservationId) });
		let periodId = reservation.period;
		let periodResult = await db.collection('periods').deleteOne({ _id: mongo.ObjectId(periodId) });
		if (periodResult.deletedCount != 1) {
			res.status(501).json({
				status: 'Deletion failed.',
			});
		}
		// delete reservation
		let result = await db.collection('reservations').deleteOne({ _id: mongo.ObjectId(reservationId) });
		if (result.deletedCount == 1) {
			res.status(200).json({
				status: 'Reservation deletion successful.'
			});
		} else {
			res.status(501).json({
				status: 'Reservation deletion failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});

// update one reservation using patch
app.patch('/reservation/:id', (req, res) => {
	let reservationId = req.params.id;
	let data = req.body;
	console.log(data);
	res.statusCode = 200;
	res.setHeader('Location', '/reservation/' + reservationId);
	res.send();
});

// update one reservation using put
app.put('/reservation/:id', (req, res) => {
	let reservationId = req.params.id;
	let data = req.body;
	if (
			!data.period || !data.madeByGuest || !data.guests || data.guests.length==0 || !data.currentState
			|| !data.price.value || !data.price.currency || !data.price.valueInEur
			|| Object.keys(data).length != 6
		) {
		res.statusCode = 400;
		return res.send();
	}
	console.log(data);
	res.statusCode = 200;
	res.setHeader('Location', '/reservation/' + reservationId);
	res.send();
});


// route or path: /reservation/:id/guests

// get price of one reservation
app.get('/reservation/:id/guests', async (req, res) => {	
	// save data and connect to database
	let reservationId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	if (reservationId && reservationId.match(/^[0-9a-fA-F]{24}$/)) {
		// get wanted document and its subdocuments from database collections
		let cursor = await db.collection("reservations").aggregate([
			{
				$match: { _id: mongo.ObjectId(reservationId) }
			},
			{
				$lookup: {
					from: "guests",
					localField: "madeByGuest",
					foreignField: "_id",
					as: 'madeByGuest'
				}
			},
			{ $unwind: '$madeByGuest' },
			{
				$lookup: {
					from: "guests",
					localField: "guests",
					foreignField: "_id",
					as: 'guests'
				}
			}
		]);
		let reservation = await cursor.toArray();
		// modify and send retrieved data
		if (reservation.length === 0) res.status(200).json(null);
		else {
			reservation = reservation[0];
			// console.log(reservation);
			let guests = reservation.guests;
			guests.unshift(reservation.madeByGuest);
			res.status(200).json(guests);
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});



// =============== Period ===============


// route or path: /periods

// get all periods
app.get('/periods', async (req, res) => {
	// generate selection and connect to database
	let selection = {};
	// console.log(selection);
	let db = await connect();
	// get all documents (and limit them if necessary) from database collection and send it
	let cursor = await db.collection("periods").find(selection);
	const limit = req.query.limit;
	if (limit && Number.isInteger(Number(limit)) && Number(limit) >= 0) {
		cursor = cursor.limit(Number(limit));
	}
	let results = await cursor.toArray();
	res.status(200).json(results);
});

// add / insert one period
app.post('/periods', async (req, res) => {
	// save data and connect to database
	let doc = req.body;
	console.log(doc);
	let db = await connect();
	// check data requirements fulfillment
	const allowedAttributes = ["name", "start", "end", "privateAccomodation"];
	const allowedPrivateAccomodationAttributes = ["id", "name"];
	const check = Boolean(
		doc.name && typeof doc.name === "string"
		&& doc.start && typeof doc.start === "string"
		&& doc.end && typeof doc.end === "string"
		&& doc.privateAccomodation && typeof doc.privateAccomodation === "object"
		&& doc.privateAccomodation.id && typeof doc.privateAccomodation.id === "string"
		&& doc.privateAccomodation.id.match(/^[0-9a-fA-F]{24}$/)
		&& doc.privateAccomodation.name && typeof doc.privateAccomodation.name === "string"
		&& Object.keys(doc).length === 4 && Object.keys(doc.privateAccomodation).length === 2
		&& Object.keys(doc).every(attribute => allowedAttributes.includes(attribute))
		&& Object.keys(doc.privateAccomodation).every(attribute => allowedPrivateAccomodationAttributes.includes(attribute))
	);
	if (check) {
		doc.privateAccomodation.id = mongo.ObjectId(doc.privateAccomodation.id);
		// save document to database collection and give feedback
		let result = await db.collection('periods').insertOne(doc);
		if (result.insertedId !== null) {
			res.status(201).json({
				status: 'Period creation successful.',
				_id: result.insertedId,
			});
		} else {
			res.status(501).json({
				status: 'Period creation failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});


// route or path: /period/:id

// get one period
app.get('/period/:id', async (req, res) => {
	// save data and connect to database
	let periodId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	if (periodId && periodId.match(/^[0-9a-fA-F]{24}$/)) {
		// get wanted document from database collection and send it
		let period = await db.collection("periods").findOne({ _id: mongo.ObjectId(periodId) });
		// console.log(period);
		res.status(200).json(period);
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});

// delete one period
app.delete('/period/:id', async (req, res) => {	
	// save data and connect to database
	let periodId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	const check = Boolean(
		periodId && periodId.match(/^[0-9a-fA-F]{24}$/)
	);
	if (check) {
		// if guest belongs to a reservation, don't delete it
		let reservation = await db.collection("reservations").findOne({ period: mongo.ObjectId(periodId) });
		if (!reservation) {
			// delete document from database collection and give feedback
			let result = await db.collection('periods').deleteOne({ _id: mongo.ObjectId(periodId) });
			if (result.deletedCount == 1) {
				res.status(200).json({
					status: 'Period deletion successful.'
				});
			} else {
				res.status(501).json({
					status: 'Period deletion failed.',
				});
			}
		} else {
			// send message data requirements not met if that is the case or if period belongs to reservation, don't delete it
			res.status(400).json({
				status: 'Period belongs to a reservation and it cannot be deleted.',
			});
		}
	} else {
		// send message data requirements not met if that is the case or if period belongs to reservation, don't delete it
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});

// update one period using patch
app.patch('/period/:id', async (req, res) => {
	// save and modify data, connect to database
	let doc = req.body;
	delete doc._id;
	let periodId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	const allowedAttributes = ["name", "start", "end", "privateAccomodation"];
	const allowedPrivateAccomodationAttributes = ["id", "name"];
	const check = Boolean(
		periodId && periodId.match(/^[0-9a-fA-F]{24}$/)
		&& (
			(doc.name && typeof doc.name === "string")
			|| (doc.start && typeof doc.start === "string")
			|| (doc.end && typeof doc.end === "string")
			|| (
				(doc.privateAccomodation && typeof doc.privateAccomodation === "object")
				|| (doc.privateAccomodation.id && typeof doc.privateAccomodation.id === "string"
					&& doc.privateAccomodation.id.match(/^[0-9a-fA-F]{24}$/))
				|| (doc.privateAccomodation.name && typeof doc.privateAccomodation.name === "string")
			)
		)
		&& Object.keys(doc).length <= 4 && Object.keys(doc.privateAccomodation).length <= 2
		&& Object.keys(doc).every(attribute => allowedAttributes.includes(attribute))
		&& Object.keys(doc.privateAccomodation).every(attribute => allowedPrivateAccomodationAttributes.includes(attribute))
		&& Object.values(doc).every(value => value !== "" && value !== null && value !== undefined)
		&& Object.values(doc.privateAccomodation).every(value => value !== "" && value !== null && value !== undefined)
	);
	if (check) {
		doc.privateAccomodation.id = mongo.ObjectId(doc.privateAccomodation.id);
		// update document in database collection and give feedback
		let result = await db.collection('periods').updateOne(
			{ _id: mongo.ObjectId(periodId) },
			{ $set: doc }
		);
		if (result.matchedCount == 1 && result.modifiedCount == 1) {
			res.status(200).json({
				status: 'Period updated successfully',
				id: result.modifiedId,
			});
		} else {
			res.status(501).json({
				status: 'Period update failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});

// update one period using put
app.put('/period/:id', async (req, res) => {	
	// save and modify data, connect to database
	let doc = req.body;
	delete doc._id;
	let periodId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	const allowedAttributes = ["name", "start", "end", "privateAccomodation"];
	const allowedPrivateAccomodationAttributes = ["id", "name"];
	const check = Boolean(
		periodId && periodId.match(/^[0-9a-fA-F]{24}$/)
		&& doc.name && typeof doc.name === "string"
		&& doc.start && typeof doc.start === "string"
		&& doc.end && typeof doc.end === "string"
		&& doc.privateAccomodation && typeof doc.privateAccomodation === "object"
		&& doc.privateAccomodation.id && typeof doc.privateAccomodation.id === "string"
		&& doc.privateAccomodation.id.match(/^[0-9a-fA-F]{24}$/)
		&& doc.privateAccomodation.name && typeof doc.privateAccomodation.name === "string"
		&& Object.keys(doc).length === 4 && Object.keys(doc.privateAccomodation).length === 2
		&& Object.keys(doc).every(attribute => allowedAttributes.includes(attribute))
		&& Object.keys(doc.privateAccomodation).every(attribute => allowedPrivateAccomodationAttributes.includes(attribute))
	);
	if (check) {
		doc.privateAccomodation.id = mongo.ObjectId(doc.privateAccomodation.id);
		// update document in database collection and give feedback
		let result = await db.collection('periods').updateOne(
			{ _id: mongo.ObjectId(periodId) },
			{ $set: doc }
		);
		if (result.matchedCount == 1 && result.modifiedCount == 1) {
			res.status(200).json({
				status: 'Period updated successfully',
				id: result.modifiedId,
			});
		} else {
			res.status(501).json({
				status: 'Period update failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});



// =============== Guest ===============


// route or path: /guests

// get all guests
app.get('/guests', async (req, res) => {
	// generate selection and connect to database
	let selection = {};
	if (req.query.actuallyGuests === "true") {
		selection["newestPeriod.start"] = { $ne: null };
		selection["newestPeriod.end"] = { $ne: null };
	} else if (req.query.actuallyGuests === "false") {
		selection["newestPeriod.start"] = null;
		selection["newestPeriod.end"] = null;
	}
	// console.log(selection);
	let db = await connect();
	// get all documents (and limit them if necessary) from database collection and send it
	let cursor = await db.collection("guests").find(selection);
	const limit = req.query.limit;
	if (limit && Number.isInteger(Number(limit)) && Number(limit) >= 0) {
		cursor = cursor.limit(Number(limit));
	}
	let results = await cursor.toArray();
	res.status(200).json(results);
});

// add / insert one guest
app.post('/guests', async (req, res) => {
	// save data and connect to database
	let doc = req.body;
	console.log(doc);
	let db = await connect();
	// check data requirements fulfillment
	const allowedAttributes = ["firstName", "lastName", "city", "country", "email", "phoneNumber", "currentState", "newestPeriod"];
	const allowedNewestPeriodAttributes = ["start", "end", "privateAccomodation"];
	const check = Boolean(
		doc.firstName && typeof doc.firstName === "string"
		&& doc.lastName && typeof doc.lastName === "string"
		&& doc.city && typeof doc.city === "string"
		&& doc.country && typeof doc.country === "string"
		&& ((doc.email && typeof doc.email === "string") || !doc.email)
		&& ((doc.phoneNumber && typeof doc.phoneNumber === "string") || !doc.phoneNumber)
		&& doc.currentState && typeof doc.currentState === "string"
		&& doc.newestPeriod && !doc.newestPeriod.start && !doc.newestPeriod.end && !doc.newestPeriod.privateAccomodation
		&& Object.keys(doc).length === 8 && Object.keys(doc.newestPeriod).length === 3
		&& Object.keys(doc).every(attribute => allowedAttributes.includes(attribute))
		&& Object.keys(doc.newestPeriod).every(attribute => allowedNewestPeriodAttributes.includes(attribute))
	);
	if (check) {
		// save document to database collection and give feedback
		let result = await db.collection('guests').insertOne(doc);
		if (result.insertedId !== null) {
			res.status(201).json({
				status: 'Guest creation successful.',
				_id: result.insertedId,
			});
		} else {
			res.status(501).json({
				status: 'Guest creation failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});


// route or path: /guest/:id

// get one guest
app.get('/guest/:id', async (req, res) => {
	// save data and connect to database
	let guestId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	if (guestId && guestId.match(/^[0-9a-fA-F]{24}$/)) {
		// get wanted document from database collection and send it
		let guest = await db.collection("guests").findOne({ _id: mongo.ObjectId(guestId) });
		// console.log(guest);
		res.status(200).json(guest);
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});

// delete one guest
app.delete('/guest/:id', async (req, res) => {
	// save data and connect to database
	let guestId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	const check = Boolean(
		guestId && guestId.match(/^[0-9a-fA-F]{24}$/)
	);
	if (check) {
		// if guest belongs to a reservation, don't delete it
		let reservation = await db.collection("reservations").findOne({
			$or: [
				{ madeByGuest: mongo.ObjectId(guestId) },
				{
					guests: { $in: [mongo.ObjectId(guestId)] }
				}
			]
		});
		if (!reservation) {
			// delete document from database collection and give feedback
			let result = await db.collection('guests').deleteOne({ _id: mongo.ObjectId(guestId) });
			if (result.deletedCount == 1) {
				res.status(200).json({
					status: 'Guest deletion successful.'
				});
			} else {
				res.status(501).json({
					status: 'Guest deletion failed.',
				});
			}
		} else {
			// send message data requirements not met if that is the case or if guest belongs to reservation, don't delete it
			res.status(400).json({
				status: 'Guest belongs to a reservation and it cannot be deleted.',
			});
		}
	} else {
		// send message data requirements not met if that is the case or if guest belongs to reservation, don't delete it
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});

// update one guest using patch
app.patch('/guest/:id', async (req, res) => {
	// save and modify data, connect to database
	let doc = req.body;
	delete doc._id;
	let guestId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	const allowedAttributes = ["firstName", "lastName", "city", "country", "email", "phoneNumber", "currentState", "newestPeriod"];
	const allowedNewestPeriodAttributes = ["start", "end", "privateAccomodation"];
	const check = Boolean(
		guestId && guestId.match(/^[0-9a-fA-F]{24}$/)
		&& (
			(doc.firstName && typeof doc.firstName === "string")
			|| (doc.lastName && typeof doc.lastName === "string")
			|| (doc.city && typeof doc.city === "string")
			|| (doc.country && typeof doc.country === "string")
			|| (doc.email && typeof doc.email === "string")
			|| (doc.phoneNumber && typeof doc.phoneNumber === "string")
			|| (
				(doc.currentState && typeof doc.currentState === "string")
				&& doc.newestPeriod
				&& Object.keys(doc.newestPeriod).length <= 3
				&& Object.keys(doc.newestPeriod).every(attribute => allowedNewestPeriodAttributes.includes(attribute))
				&& (doc.newestPeriod.start && typeof doc.newestPeriod.start === "string")
				&& (doc.newestPeriod.end && typeof doc.newestPeriod.end === "string")
				&& (doc.newestPeriod.privateAccomodation && typeof doc.newestPeriod.privateAccomodation === "string")
			)
		)
		&& Object.keys(doc).length <= 8
		&& Object.keys(doc).every(attribute => allowedAttributes.includes(attribute))
	);
	if (check) {
		// update document in database collection and give feedback
		let result = await db.collection('guests').updateOne(
			{ _id: mongo.ObjectId(guestId) },
			{ $set: doc }
		);
		if (result.matchedCount == 1 && result.modifiedCount == 1) {
			res.status(200).json({
				status: 'Guest updated successfully',
				id: result.modifiedId,
			});
		} else {
			res.status(501).json({
				status: 'Guest update failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});

// update one guest using put
app.put('/guest/:id', async (req, res) => {
	// save and modify data, connect to database
	let doc = req.body;
	delete doc._id;
	let guestId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	const allowedAttributes = ["firstName", "lastName", "city", "country", "email", "phoneNumber", "currentState", "newestPeriod"];
	const allowedNewestPeriodAttributes = ["start", "end", "privateAccomodation"];
	const check = Boolean(
		guestId && guestId.match(/^[0-9a-fA-F]{24}$/)
		&& doc.firstName && typeof doc.firstName === "string"
		&& doc.lastName && typeof doc.lastName === "string"
		&& doc.city && typeof doc.city === "string"
		&& doc.country && typeof doc.country === "string"
		&& ((doc.email && typeof doc.email === "string") || !doc.email)
		&& ((doc.phoneNumber && typeof doc.phoneNumber === "string") || !doc.phoneNumber)
		&& doc.currentState && typeof doc.currentState === "string"
		&& doc.newestPeriod
		&& ((doc.newestPeriod.start && typeof doc.newestPeriod.start === "string") || !doc.newestPeriod.start)
		&& ((doc.newestPeriod.end && typeof doc.newestPeriod.end === "string") || !doc.newestPeriod.end)
		&& (
			(doc.newestPeriod.privateAccomodation && typeof doc.newestPeriod.privateAccomodation === "string")
			|| !doc.newestPeriod.privateAccomodation
		)
		&& Object.keys(doc).length === 8 && Object.keys(doc.newestPeriod).length === 3
		&& Object.keys(doc).every(attribute => allowedAttributes.includes(attribute))
		&& Object.keys(doc.newestPeriod).every(attribute => allowedNewestPeriodAttributes.includes(attribute))
	);
	if (check) {
		// update document in database collection and give feedback
		let result = await db.collection('guests').updateOne(
			{ _id: mongo.ObjectId(guestId) },
			{ $set: doc }
		);
		if (result.matchedCount == 1 && result.modifiedCount == 1) {
			res.status(200).json({
				status: 'Guest updated successfully',
				id: result.modifiedId,
			});
		} else {
			res.status(501).json({
				status: 'Guest update failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});



// =============== Note ===============


// route or path: /notes

// get all notes
app.get('/notes', async (req, res) => {
	// generate selection and connect to database
	let selection = {};
	// console.log(req.query.important);
	if (req.query.important === "true") selection["important"] = true;
	else if (req.query.important === "false") selection["important"] = false;
	// console.log(selection);
	let db = await connect();
	// get all documents from database collection and send it
	let cursor = await db.collection("notes").find(selection);
	let results = await cursor.toArray();
	res.status(200).json(results);
});

// add / insert one note
app.post('/notes', async (req, res) => {
	// save data and connect to database
	let doc = req.body;
	console.log(doc);
	let db = await connect();
	// check data requirements fulfillment
	const check = Boolean(
		doc.heading && typeof doc.heading === "string"
		&& doc.body && typeof doc.body === "string"
		&& doc.important !== "" && doc.important !== null && doc.important !== undefined && typeof doc.important === "boolean"
		&& Object.keys(doc).length === 3
	);
	if (check) {
		// save document to database collection and give feedback
		let result = await db.collection('notes').insertOne(doc);
		if (result.insertedId !== null) {
			res.status(201).json({
				status: 'Note creation successful.',
				_id: result.insertedId,
			});
		} else {
			res.status(501).json({
				status: 'Note creation failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});


// route or path: /note/:id

// get one note
app.get('/note/:id', async (req, res) => {
	// save data and connect to database
	let noteId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	if (noteId && noteId.match(/^[0-9a-fA-F]{24}$/)) {
		// get wanted document from database collection and send it
		let note = await db.collection("notes").findOne({ _id: mongo.ObjectId(noteId) });
		// console.log(note);
		res.status(200).json(note);
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});

// delete one note
app.delete('/note/:id', async (req, res) => {
	// save data and connect to database
	let noteId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	const check = Boolean(
		noteId && noteId.match(/^[0-9a-fA-F]{24}$/)
	);
	if (check) {
		// delete document from database collection and give feedback
		let result = await db.collection('notes').deleteOne({ _id: mongo.ObjectId(noteId) });
		if (result.deletedCount == 1) {
			res.status(200).json({
				status: 'Note deletion successful.'
			});
		} else {
			res.status(501).json({
				status: 'Note deletion failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});

// update one note using patch
app.patch('/note/:id', async (req, res) => {
	// save and modify data, connect to database
	let doc = req.body;
	delete doc._id;
	let noteId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	const allowedAttributes = ["heading", "body", "important"];
	const check = Boolean(
		noteId && noteId.match(/^[0-9a-fA-F]{24}$/)
		&& (
			(doc.heading && typeof doc.heading === "string")
			|| (doc.body && typeof doc.body === "string")
			|| (doc.important !== "" && doc.important !== null && doc.important !== undefined && typeof doc.important === "boolean")
		)
		&& (
			Object.keys(doc).length <= 3
			&& Object.keys(doc).every(attribute => allowedAttributes.includes(attribute))
			&& Object.values(doc).every(value => value !== "" && value !== null && value !== undefined)
		)
	);
	if (check) {
		// update document in database collection and give feedback
		let result = await db.collection('notes').updateOne(
			{ _id: mongo.ObjectId(noteId) },
			{ $set: doc }
		);
		if (result.matchedCount == 1 && result.modifiedCount == 1) {
			res.status(200).json({
				status: 'Note updated successfully',
				id: result.modifiedId,
			});
		} else {
			res.status(501).json({
				status: 'Note update failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});

// update one note using put
app.put('/note/:id', async (req, res) => {
	// save and modify data, connect to database
	let doc = req.body;
	delete doc._id;
	let noteId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	const allowedAttributes = ["heading", "body", "important"];
	const check = Boolean(
		noteId && noteId.match(/^[0-9a-fA-F]{24}$/)
		&& doc.heading && typeof doc.heading === "string"
		&& doc.body && typeof doc.body === "string"
		&& doc.important !== "" && doc.important !== null && doc.important !== undefined && typeof doc.important === "boolean"
		&& Object.keys(doc).length === 3 && Object.keys(doc).every(attribute => allowedAttributes.includes(attribute))
	);
	if (check) {
		// update document in database collection and give feedback
		let result = await db.collection('notes').updateOne(
			{ _id: mongo.ObjectId(noteId) },
			{ $set: doc }
		);
		if (result.matchedCount == 1 && result.modifiedCount == 1) {
			res.status(200).json({
				status: 'Note updated successfully',
				id: result.modifiedId,
			});
		} else {
			res.status(501).json({
				status: 'Note update failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});



// =============== ToDoList ===============


// route or path: /todolists

// get all to do lists
app.get('/todolists', async (req, res) => {
	// generate selection and connect to database
	let selection = {};
	// console.log(req.query.completed);
	if (req.query.completed === "false") selection["completed"] = false;
	else if (req.query.completed === "true") selection["completed"] = true;
	// console.log(selection);
	let db = await connect();
	// get all documents from database collection and send it
	let cursor = await db.collection("todolists").find(selection);
	let results = await cursor.toArray();
	res.status(200).json(results);
});

// add / insert one to do list
app.post('/todolists', async (req, res) => {
	// save data and connect to database
	let doc = req.body;
	console.log(doc);
	let db = await connect();
	// check data requirements fulfillment
	const check = Boolean(
		doc.title && typeof doc.title === "string"
		&& doc.date && typeof doc.date === "string"
		&& doc.completed !== "" && doc.completed !== null && doc.completed !== undefined && typeof doc.completed === "boolean"
		&& doc.items.length > 0
		&& doc.items.every(item =>
				item.name && typeof item.name === "string"
				&& item.position !== "" && item.position !== null && item.position !== undefined && typeof item.position === "number"
				&& item.position === doc.items.indexOf(item)
				&& item.completed !== "" && item.completed !== null && item.completed !== undefined && typeof item.completed === "boolean"
				&& Object.keys(item).length === 3
			)
		&& (
			(doc.completed === true && doc.items.every(item => item.completed === true))
			|| (doc.completed === false && doc.items.some(item => item.completed === false))
		)
		&& Object.keys(doc).length === 4
	);
	if (check) {
		// save document to database collection and give feedback
		let result = await db.collection('todolists').insertOne(doc);
		if (result.insertedId !== null) {
			res.status(201).json({
				status: 'To-do list creation successful.',
				_id: result.insertedId,
			});
		} else {
			res.status(501).json({
				status: 'To-do list creation failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});


// route or path: /todolist/:id

// get one to do list
app.get('/todolist/:id', async (req, res) => {
	// save data and connect to database
	let toDoListId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	if (toDoListId && toDoListId.match(/^[0-9a-fA-F]{24}$/)) {
		// get wanted document from database collection and send it
		let toDoList = await db.collection("todolists").findOne({ _id: mongo.ObjectId(toDoListId) });
		// console.log(toDoList);
		res.status(200).json(toDoList);
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});

// delete one to do list
app.delete('/todolist/:id', async (req, res) => {
	// save data and connect to database
	let toDoListId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	const check = Boolean(
		toDoListId && toDoListId.match(/^[0-9a-fA-F]{24}$/)
	);
	if (check) {
		// delete document from database collection and give feedback
		let result = await db.collection('todolists').deleteOne({ _id: mongo.ObjectId(toDoListId) });
		if (result.deletedCount == 1) {
			res.status(200).json({
				status: 'To-do list deletion successful.'
			});
		} else {
			res.status(501).json({
				status: 'To-do list deletion failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});

// update one to do list using patch
app.patch('/todolist/:id', async (req, res) => {
	// save and modify data, connect to database
	let doc = req.body;
	delete doc._id;
	let toDoListId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	const allowedAttributes = ["title", "date", "completed", "items"];
	const allowedItemAttributes = ["name", "position", "completed"];
	const check = Boolean(
		toDoListId && toDoListId.match(/^[0-9a-fA-F]{24}$/)
		&& (
			(doc.title && typeof doc.title === "string")
			|| (doc.date && typeof doc.date === "string")
			|| (
				(doc.completed !== "" && doc.completed !== null && doc.completed !== undefined && typeof doc.completed === "boolean")
				&& (
					(doc.items && Array.isArray(doc.items) && doc.items.length > 0)
					&& doc.items.every(item =>
						(
							(item.name && typeof item.name === "string")
							|| (
								(item.position !== "" && item.position !== null && item.position !== undefined && typeof item.position === "number")
								&& (item.position === doc.items.indexOf(item))
							)
							|| (item.completed !== "" && item.completed !== null && item.completed !== undefined && typeof item.completed === "boolean")
						)
						&& (
							Object.keys(item).length <= 3
							&& Object.keys(item).every(attribute => allowedItemAttributes.includes(attribute)))
							&& Object.values(item).every(value => value !== "" && value !== null && value !== undefined)
					)
					&& (
						(doc.completed === true && doc.items.every(item => item.completed === true))
						|| (doc.completed === false && doc.items.some(item => item.completed === false))
					)
				)
			)
		)
		&& (
			Object.keys(doc).length <= 4
			&& Object.keys(doc).every(attribute => allowedAttributes.includes(attribute))
			&& Object.values(doc).every(value => value !== "" && value !== null && value !== undefined)
		)
	);
	if (check) {
		// update document in database collection and give feedback
		let result = await db.collection('todolists').updateOne(
			{ _id: mongo.ObjectId(toDoListId) },
			{ $set: doc }
		);
		if (result.matchedCount == 1 && result.modifiedCount == 1) {
			res.status(200).json({
				status: 'To-do list updated successfully',
				id: result.modifiedId,
			});
		} else {
			res.status(501).json({
				status: 'To-do list update failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});

// update one to do list using put
app.put('/todolist/:id', async (req, res) => {
	// save and modify data, connect to database
	let doc = req.body;
	delete doc._id;
	let toDoListId = req.params.id;
	let db = await connect();
	// check data requirements fulfillment
	const check = Boolean(
		toDoListId && toDoListId.match(/^[0-9a-fA-F]{24}$/)
		&& doc.title && typeof doc.title === "string"
		&& doc.date && typeof doc.date === "string"
		&& doc.completed !== "" && doc.completed !== null && doc.completed !== undefined && typeof doc.completed === "boolean"
		&& doc.items.length > 0
		&& doc.items.every(item =>
				item.name && typeof item.name === "string"
				&& item.position !== "" && item.position !== null && item.position !== undefined && typeof item.position === "number"
				&& item.position === doc.items.indexOf(item)
				&& item.completed !== "" && item.completed !== null && item.completed !== undefined && typeof item.completed === "boolean"
				&& Object.keys(item).length === 3
			)
		&& (
			(doc.completed === true && doc.items.every(item => item.completed === true))
			|| (doc.completed === false && doc.items.some(item => item.completed === false))
		)
		&& Object.keys(doc).length === 4
	);
	if (check) {
		// update document in database collection and give feedback
		let result = await db.collection('todolists').updateOne(
			{ _id: mongo.ObjectId(toDoListId) },
			{ $set: doc }
		);
		if (result.matchedCount == 1 && result.modifiedCount == 1) {
			res.status(200).json({
				status: 'To-do list updated successfully',
				id: result.modifiedId,
			});
		} else {
			res.status(501).json({
				status: 'To-do list update failed.',
			});
		}
	} else {
		// send message data requirements not met if that is the case
		res.status(400).json({
			status: 'Data requirements not met.',
		});
	}
});



// =============== Analytics ===============


// route or path: /analytics

// get analytics
app.get('/analytics', (req, res) => { // async
	/*let db = await connect();
	let cursor = await db.collection("analytics").find();
	let results = await cursor.toArray();
	res.json(results);*/
	res.send(storage.Analytics);
});



app.listen(port, () => console.log(`Listening on port ${port}!`));
