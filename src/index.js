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
	/*let data = {
		privateAccomodations: storage.PrivateAccomodation
			.sort((first, second) => first.name - second.name)
			.slice(0, 3),
		reservations: storage.Reservation
			.sort((first, second) => first.currentState - second.currentState)
			.slice(0, 3)
	};
	res.send([storage.User[0], data]);*/
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

// get all private accomodations
app.get('/privateaccomodations', async (req, res) => {
	let selection = {};
	if (req.query.limit) req.query.limit = Number(req.query.limit);
	console.log(selection);
	let db = await connect();

	let cursor = await db.collection("privateaccomodations").find(selection);
	if (req.query.limit) cursor = cursor.limit(req.query.limit);
	let results = await cursor.toArray();
	let accomodations = results.map(async accomodation => {
		let address = await db.collection("addresses").findOne({ _id: mongo.ObjectId(accomodation.location) });
		accomodation.location = address;
		// console.log(accomodation);
		return accomodation;
	});
	accomodations = await Promise.all(accomodations);

	const current = new Date();
	const date = `${current.getFullYear()}-${current.getMonth()+1}-${current.getDate()}`;
	accomodations = results.map(async accomodation => {
		let period = await db.collection("periods")
			.findOne({ privateAccomodationObjectId: mongo.ObjectId(accomodation._id), start: { $lte : date }, end: { $gte : date } }); // Manually?
		if (!period) {
			accomodation.currentState = "AVAILABLE";
		} else {
			let reservation = await db.collection("reservations").findOne({ period: mongo.ObjectId(period._id) });
			if (reservation.currentState === "CONFIRMED") {
				accomodation.currentState = "OCCUPIED";
			} else {
				accomodation.currentState = "PENDING";
			}
		}
		console.log(accomodation);
		return accomodation;
	});
	accomodations = await Promise.all(accomodations);

	res.json(accomodations);
});

// add / insert one private accomodation
app.post('/privateaccomodations', async (req, res) => {
	let db = await connect();
	let doc = req.body;
	console.log(doc);

	let result = await db.collection('privateaccomodations').insertOne(doc);
	if (result.insertedCount == 1) {
		res.json({
			status: 'success',
			_id: result.insertedId,
		});
	} else {
		res.json({
			status: 'fail',
		});
	}
});


// route or path: /privateaccomodation/:id

// get one private accomodation
app.get('/privateaccomodation/:id', async (req, res) => {
	let privateAccomodationId = req.params.id;
	let db = await connect();

	let privateAccomodation = await db.collection("privateaccomodations").findOne({ _id: mongo.ObjectId(privateAccomodationId) });
	let address = await db.collection("addresses").findOne({ _id: mongo.ObjectId(privateAccomodation.location) });
	privateAccomodation.location = address;

	res.json(privateAccomodation);
});

// delete one private accomodation
app.delete('/privateaccomodation/:id', async (req, res) => {
	let db = await connect();
	let privateAccomodationId = req.params.id;
	// find accomodation
	let accomodation = await db.collection("privateaccomodations").findOne({ _id: mongo.ObjectId(privateAccomodationId) });
	// chack if there is any more accomodations on the same address
	let accomodationOnSameAddress = await db.collection("privateaccomodations")
		.findOne({ location: mongo.ObjectId(accomodation.location) });
	// delete address if needed
	if (!accomodationOnSameAddress) {
		let addressResult = await db.collection('addresses').deleteOne({ _id: accomodation.location });
		if (addressResult.deletedCount == 1) res.statusCode = 201;
		else {
			res.statusCode = 500;
			res.json({ status: 'fail' });
		}
	}
	// delete accomodation
	let result = await db.collection('privateaccomodations').deleteOne({ _id: mongo.ObjectId(privateAccomodationId) });
	if (result.deletedCount == 1 && res.statusCode == 201) {
		res.statusCode = 201;
		res.json({
			status: 'success'
		});
	} else {
		res.statusCode = 500;
		res.json({
			status: 'fail',
		});
	}
});

// update one private accomodation using patch
app.patch('/privateaccomodation/:id', (req, res) => {
	let privateAccomodationId = req.params.id;
	let data = req.body;
	console.log(data);
	res.statusCode = 200;
	res.setHeader('Location', '/privateaccomodation/' + privateAccomodationId);
	res.send();
});

// update one private accomodation using put
app.put('/privateaccomodation/:id', (req, res) => {
	let privateAccomodationId = req.params.id;
	let data = req.body;
	if (
			!data.name || !data.categoryStarNumber || !data.maxGuestNumber || !data.location
			|| !data.numberofFloors || data.hasYard == null || data.lowestFloor == null
			|| Object.keys(data).length != 9
		) {
		res.statusCode = 400;
		return res.send();
	}
	console.log(data);
	res.statusCode = 200;
	res.setHeader('Location', '/privateaccomodation/' + privateAccomodationId);
	res.send();
});


// route or path: /privateaccomodation/:id/address

// get address of one private accomodation
app.get('/privateaccomodation/:id/address', (req, res) => {
	let privateAccomodationId = req.params.id;
	let privateAccomodation = storage.PrivateAccomodation.filter(item => item.ObjectId == privateAccomodationId)[0];
	let addressId = privateAccomodation.location;
	let address = storage.Address.filter(item => item.ObjectId == addressId)[0];
	res.send(address);
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
	let db = await connect();
	let doc = req.body;
	console.log(doc);

	let result = await db.collection('addresses').insertOne(doc);
	if (result.insertedCount == 1) {
		res.json({
			status: 'success',
			_id: result.insertedId,
		});
	} else {
		res.json({
			status: 'fail',
		});
	}
});


// route or path: /address/:id

// get one address
app.get('/address/:id', (req, res) => {
	let addressId = req.params.id;
	let address = storage.Address.filter(item => item.ObjectId == addressId)[0];
	res.send(address);
});

// delete one address
app.delete('/address/:id', (req, res) => {
	let addressId = req.params.id;
	res.statusCode = 204;
	res.setHeader('Location', '/address/' + addressId);
	res.send();
});

// update one address using patch
app.patch('/address/:id', (req, res) => {
	let addressId = req.params.id;
	let data = req.body;
	console.log(data);
	res.statusCode = 200;
	res.setHeader('Location', '/address/' + addressId);
	res.send();
});

// update one address using put
app.put('/address/:id', (req, res) => {
	let addressId = req.params.id;
	let data = req.body;
	if (
			!data.street || !data.houseNumber || !data.entranceNumber || !data.postalNumber || !data.city
			|| Object.keys(data).length != 6
		) {
		res.statusCode = 400;
		return res.send();
	}
	console.log(data);
	res.statusCode = 200;
	res.setHeader('Location', '/address/' + addressId);
	res.send();
});



// =============== Reservation ===============


// route or path: /reservations

// get all reservations
app.get('/reservations', async (req, res) => {
	let db = await connect();
	let cursor = await db.collection("reservations").find();
	let results = await cursor.toArray();
	let reservations = results.map(async reservation => {
		let periodAndMainGuest = await Promise.all([
			await db.collection("guests").findOne({ _id: mongo.ObjectId(reservation.madeByGuest) }),
			await db.collection("periods").findOne({ _id: mongo.ObjectId(reservation.period) })
		]);
		reservation.madeByGuest = periodAndMainGuest[0];
		reservation.period = periodAndMainGuest[1];
		// console.log("guests");
		// FIX / to-do: add all guests to reservation
		// console.log(reservation.guests);
		/*reservation.guests = reservation.guests.map(async guest => {
			let reservationGuest = await db.collection("guests").findOne({ _id: guest });
			return reservationGuest;
		});*/
		console.log(reservation);
		return reservation;
	});
	reservations = await Promise.all(reservations);
	
	if (req.query.upcoming === "true") {
		const current = new Date();
		const date = `${current.getFullYear()}-${current.getMonth()+1}-${current.getDate()}`;
		console.log(date);
		reservations = reservations.filter(reservation => Date.parse(reservation.period.start.split(" ")[0]) > Date.parse(date));
	}
	if (req.query.limit) {
		req.query.limit = Number(req.query.limit);
		// reservations = reservations.sort((first, second) => first.period.start - second.period.start) // NEEDS TESTING
			// .slice(0, req.query.limit);
	}

	console.log(reservations);
	res.json(reservations);
});

// add / insert one reservation
app.post('/reservations', async (req, res) => {
	let db = await connect();
	let doc = req.body;
	// set valueInEur
	if (doc.price.currency === "EUR") {
		doc.price.valueInEur = doc.price.value;
	} else {
		const currentValueInEur = await AxiosServiceExchangeRates.get(
			`/convert?to=EUR&from=${doc.price.currency}&amount=${doc.price.value}`,
			{
				redirect: 'follow',
				headers: {
					"apikey": process.env.API_LAYER_KEY,
				}
			}
		);
		// console.log("currentValueInEur");
		// console.log(currentValueInEur.data.result);
		doc.price.valueInEur = currentValueInEur.data.result;
	}

	let result = await db.collection('reservations').insertOne(doc);
	if (result.insertedCount == 1) {
		res.json({
			status: 'success',
			_id: result.insertedId,
		});
	} else {
		res.json({
			status: 'fail',
		});
	}
});


// route or path: /reservation/:id

// get one reservation
app.get('/reservation/:id', async (req, res) => {
	let reservationId = req.params.id;
	let db = await connect();

	let reservation = await db.collection("reservations").findOne({ _id: mongo.ObjectId(reservationId) });
	let period = await db.collection("periods").findOne({ _id: mongo.ObjectId(reservation.period) });
	reservation.period = period;
	let guestWhoBooked = await db.collection("guests").findOne({ _id: mongo.ObjectId(reservation.madeByGuest) });
	reservation.madeByGuest = guestWhoBooked;
	let guestsFromDb = reservation.guests.map(async guest => {
		let guestFromDB = await db.collection("guests").findOne({ _id: mongo.ObjectId(guest) });
		return guestFromDB;
	});
	reservation.guests = await Promise.all(guestsFromDb);
	console.log(reservation.guests);

	res.json(reservation);
});

// delete one reservation
app.delete('/reservation/:id', async (req, res) => {
	let db = await connect();
	let reservationId = req.params.id;
	// delete belonging period
	let periodId = await db.collection('reservations').findOne({ _id: mongo.ObjectId(reservationId) }).period;
	let periodResult = await db.collection('periods').deleteOne({ _id: mongo.ObjectId(periodId) });
	if (periodResult.deletedCount == 1) res.statusCode = 201;
	else {
		res.statusCode = 500;
		res.json({ status: 'fail' });
	}
	// delete reservation
	let result = await db.collection('reservations').deleteOne({ _id: mongo.ObjectId(reservationId) });
	if (result.deletedCount == 1) {
		res.json({
			status: 'success'
		});
	} else {
		res.statusCode = 500;
		res.json({
			status: 'fail',
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
app.get('/reservation/:id/guests', (req, res) => {
	let reservationId = req.params.id;
	let reservation = storage.Reservation.filter(item => item.ObjectId == reservationId)[0];
	let guestIds = reservation.guests;
	let guests = [];
	guestIds.forEach(guestId => {
		let guest = storage.Guest.filter(item => item.ObjectId == guestId)[0];
		guests.push(guest);
	});
	res.send(guests);
});



// =============== Period ===============


// route or path: /periods

// get all periods
app.get('/periods', async (req, res) => {
	let db = await connect();
	let cursor = await db.collection("periods").find();
	let results = await cursor.toArray();
	res.json(results);
	// res.send(storage.Period);
});

// add / insert one period
app.post('/periods', async (req, res) => {
	let db = await connect();
	let doc = req.body;
	console.log(doc);

	let result = await db.collection('periods').insertOne(doc);
	if (result.insertedCount == 1) {
		res.json({
			status: 'success',
			_id: result.insertedId,
		});
	} else {
		res.json({
			status: 'fail',
		});
	}
});


// route or path: /period/:id

// get one period
app.get('/period/:id', async (req, res) => {
	let periodId = req.params.id;
	let db = await connect();
	let period = await db.collection("periods").findOne({ _id: mongo.ObjectId(periodId) });
	console.log(period);
	res.json(period);
});

// delete one period
app.delete('/period/:id', async (req, res) => {
	let db = await connect();
	let periodId = req.params.id;
	// if period belongs to reservation, don't delete it
	let reservation = await db.collection("reservations").findOne({ period: mongo.ObjectId(periodId) });
	if (reservation) {
		res.statusCode = 500;
		res.json({
			status: 'fail',
			reason: "You cannot delete this period. It belongs to a reservation."
		});
	} else {
		// delete period
		let result = await db.collection('periods').deleteOne({ _id: mongo.ObjectId(periodId) });
		if (result.deletedCount == 1) {
			res.statusCode = 201;
			res.json({
				status: 'success'
			});
		} else {
			res.statusCode = 500;
			res.json({
				status: 'fail',
			});
		}
	}
});

// update one period using patch
app.patch('/period/:id', (req, res) => {
	let periodId = req.params.id;
	let data = req.body;
	console.log(data);
	res.statusCode = 200;
	res.setHeader('Location', '/period/' + periodId);
	res.send();
});

// update one period using put
app.put('/period/:id', (req, res) => {
	let periodId = req.params.id;
	let data = req.body;
	if (
			!data.start || !data.end || Object.keys(data).length != 3
		) {
		res.statusCode = 400;
		return res.send();
	}
	console.log(data);
	res.statusCode = 200;
	res.setHeader('Location', '/period/' + periodId);
	res.send();
});



// =============== Guest ===============


// route or path: /guests

// get all guests
app.get('/guests', async (req, res) => {
	if (req.query.limit) req.query.limit = Number(req.query.limit);
	let db = await connect();
	let cursor = await db.collection("guests").find();
	if (req.query.limit) cursor = cursor.limit(req.query.limit);
	let results = await cursor.toArray();
	// res.json(results);

	let guests = results.map(async guest => {
		let reservation = await db.collection("reservations")
			.findOne({ $or: [ { madeByGuest: mongo.ObjectId(guest._id) }, { guests: { $in: [mongo.ObjectId(guest._id) ] } } ] });
		// console.log(reservation);
		guest["newestPeriod"] = reservation;
		if (!guest.newestPeriod) {
			guest.guestState = "NOT A GUEST YET";
		} else {
			if (guest.newestPeriod.currentState === "CANCELLED" ) {
				guest.guestState = "CANCELLED GUEST";
			} else if (guest.newestPeriod.currentState === "PENDING" ) {
				guest.guestState = "POSSIBLE GUEST";
			} else if (guest.newestPeriod.currentState === "INQUIRY" ) {
				guest.guestState = "POTENTIAL GUEST";
			} else if (guest.newestPeriod.currentState === "CONFIRMED" ) {
				guest.guestState = "CONFIRMED GUEST";
			}
		}
		return guest;
	});
	guests = await Promise.all(guests);

	guests = results.map(async guest => {
		if (guest.newestPeriod) {
			let period = await db.collection("periods").findOne({ _id: mongo.ObjectId(guest.newestPeriod.period) });
			// console.log(period);
			guest["newestPeriod"] = period;
		}
		return guest;
	});
	guests = await Promise.all(guests);

	guests = results.map(async guest => {
		if (guest.newestPeriod) {
			let privateAccomodation = await db.collection("privateaccomodations")
				.findOne({ _id: mongo.ObjectId(guest.newestPeriod.privateAccomodationObjectId) });
			// console.log(privateAccomodation);
			guest.newestPeriod["privateAccomodation"] = privateAccomodation;
		}
		return guest;
	});

	// TO-DO limit

	guests = await Promise.all(guests);
	console.log(guests);
	res.json(guests);
});

// add / insert one guest
app.post('/guests', async (req, res) => {
	let db = await connect();
	let doc = req.body;
	console.log(doc);

	let result = await db.collection('guests').insertOne(doc);
	if (result.insertedCount == 1) {
		res.json({
			status: 'success',
			_id: result.insertedId,
		});
	} else {
		res.json({
			status: 'fail',
		});
	}
});


// route or path: /guest/:id

// get one guest
app.get('/guest/:id', async (req, res) => {
	let guestId = req.params.id;
	let db = await connect();

	let guest = await db.collection("guests").findOne({ _id: mongo.ObjectId(guestId) });
	let reservation = await db.collection("reservations")
			.findOne({ $or: [ { madeByGuest: mongo.ObjectId(guest._id) }, { guests: { $in: [mongo.ObjectId(guest._id) ] } } ] });
	guest["newestPeriod"] = reservation;
	if (!guest.newestPeriod) {
		guest.guestState = "NOT A GUEST YET";
	} else {
		if (guest.newestPeriod.currentState === "CANCELLED" ) {
			guest.guestState = "CANCELLED GUEST";
		} else if (guest.newestPeriod.currentState === "PENDING" ) {
			guest.guestState = "POSSIBLE GUEST";
		} else if (guest.newestPeriod.currentState === "INQUIRY" ) {
			guest.guestState = "POTENTIAL GUEST";
		} else if (guest.newestPeriod.currentState === "CONFIRMED" ) {
			guest.guestState = "CONFIRMED GUEST";
		}
		let period = await db.collection("periods").findOne({ _id: mongo.ObjectId(reservation.period) });
		guest.newestPeriod = period;
		let privateAccomodation = await db.collection("privateaccomodations")
			.findOne({ _id: mongo.ObjectId(guest.newestPeriod.privateAccomodationObjectId) });
		guest.newestPeriod["privateAccomodation"] = privateAccomodation;
	}	

	res.json(guest);
});

// delete one guest
app.delete('/guest/:id', async (req, res) => {
	let db = await connect();
	let guestId = req.params.id;
	// if period belongs to reservation, don't delete it
	let reservation = await db.collection("reservations").findOne({
		$or: [
			{ madeByGuest: mongo.ObjectId(guestId) },
			{
				guests: {
					$in: [mongo.ObjectId(guestId) ]
				}
			}
		]
	});
	if (reservation) {
		res.statusCode = 500;
		res.json({
			status: 'fail',
			reason: "You cannot delete this guest. It belongs to a reservation."
		});
	} else {
		// delete period
		let result = await db.collection('guests').deleteOne({ _id: mongo.ObjectId(guestId) });
		if (result.deletedCount == 1) {
			res.statusCode = 201;
			res.json({
				status: 'success'
			});
		} else {
			res.statusCode = 500;
			res.json({
				status: 'fail',
			});
		}
	}
});

// update one guest using patch
app.patch('/guest/:id', (req, res) => {
	let guestId = req.params.id;
	let data = req.body;
	console.log(data);
	res.statusCode = 200;
	res.setHeader('Location', '/guest/' + guestId);
	res.send();
});

// update one guest using put
app.put('/guest/:id', (req, res) => {
	let guestId = req.params.id;
	let data = req.body;
	if (
			!data.firstName || !data.firstName || !data.email || !data.phoneNumber || !data.country || !data.city
			|| Object.keys(data).length != 7
		) {
		res.statusCode = 400;
		return res.send();
	}
	console.log(data);
	res.statusCode = 200;
	res.setHeader('Location', '/guest/' + guestId);
	res.send();
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
