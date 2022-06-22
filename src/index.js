import dotenv, { config } from "dotenv";
dotenv.config();

import express, { json } from 'express';
import cors from 'cors';
import mongo from 'mongodb';

import connect from './db.js';
import storage from './storage.js'

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());



// =============== default route or path ===============

// get data
app.get('/', (req, res) => {
	let data = {
		privateAccomodations: storage.PrivateAccomodation
			.sort((first, second) => first.name - second.name)
			.slice(0, 3),
		reservations: storage.Reservation
			.sort((first, second) => first.currentState - second.currentState)
			.slice(0, 3)
	};
	res.send([storage.User[0], data]);
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
	let db = await connect();
	let cursor = await db.collection("privateaccomodations").find();
	let results = await cursor.toArray();
	let accomodations = results.map(async accomodation => {
		let address = await db.collection("addresses").findOne({ _id: mongo.ObjectId(accomodation.location) });
		accomodation.location = address;
		// FIX / to-do: regulate current state
		console.log(accomodation);
		return accomodation;
	});

	/*accomodations = results.map(async accomodation => {
		let period = await db.collection("periods").findOne({ privateAccomodationObjectId: mongo.ObjectId(accomodation._id) });
		accomodation.location = address;
		// FIX / to-do: regulate current state
		console.log(accomodation);
		return accomodation;
	});*/

	accomodations = await Promise.all(accomodations);
	res.json(accomodations);
});

// add / insert one private accomodation
app.post('/privateaccomodations', (req, res) => {
	let data = req.body;
	console.log(data);
	res.statusCode = 201;
	res.setHeader('Location', '/privateaccomodations');
	res.send();
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
app.delete('/privateaccomodation/:id', (req, res) => {
	let privateAccomodationId = req.params.id;
	res.statusCode = 204;
	res.setHeader('Location', '/privateaccomodation/' + privateAccomodationId);
	res.send();
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
	let db = await connect();
	let cursor = await db.collection("addresses").find();
	let results = await cursor.toArray();
	res.json(results);
	// res.send(storage.Address);
});

// add / insert one address
app.post('/addresses', (req, res) => {
	let data = req.body;
	console.log(data);
	res.statusCode = 201;
	res.setHeader('Location', '/addresses');
	res.send();
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
	console.log(reservations);
	res.json(results);
	// res.send(storage.Reservation);
});

// add / insert one reservation
app.post('/reservations', (req, res) => {
	let data = req.body;
	console.log(data);
	res.statusCode = 201;
	res.setHeader('Location', '/reservations');
	res.send();
});


// route or path: /reservation/:id

// get one reservation
app.get('/reservation/:id', (req, res) => {
	let reservationId = req.params.id;
	let reservation = storage.Reservation.filter(item => item.ObjectId == reservationId)[0];
	res.send(reservation);
});

// delete one reservation
app.delete('/reservation/:id', (req, res) => {
	let reservationId = req.params.id;
	res.statusCode = 204;
	res.setHeader('Location', '/reservation/' + reservationId);
	res.send();
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
app.post('/periods', (req, res) => {
	let data = req.body;
	console.log(data);
	res.statusCode = 201;
	res.setHeader('Location', '/periods');
	res.send();
});


// route or path: /period/:id

// get one period
app.get('/period/:id', (req, res) => {
	let periodId = req.params.id;
	let period = storage.Period.filter(item => item.ObjectId == periodId)[0];
	res.send(period);
});

// delete one period
app.delete('/period/:id', (req, res) => {
	let periodId = req.params.id;
	res.statusCode = 204;
	res.setHeader('Location', '/period/' + periodId);
	res.send();
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
	let db = await connect();
	let cursor = await db.collection("guests").find();
	let results = await cursor.toArray();
	// res.json(results);

	// FIX / to-do: regulate guest state in DB

	let guests = results.map(async guest => {
		let reservation = await db.collection("reservations")
			.findOne({ $or: [ { madeByGuest: mongo.ObjectId(guest._id) }, { guests: { $in: [mongo.ObjectId(guest._id) ] } } ] });
		// console.log(reservation);
		guest["newestPeriod"] = reservation;
		if (!guest.newestPeriod) {
			guest.guestState = "NOT A GUEST YET";
		} else if (guest.newestPeriod.currentState === "CANCELLED" ) {
			guest.guestState = "CANCELLED GUEST";
		} else if (guest.newestPeriod.currentState === "PENDING" ) {
			guest.guestState = "POSSIBLE GUEST";
		} else if (guest.newestPeriod.currentState === "INQUIRY" ) {
			guest.guestState = "POTENTIAL GUEST";
		}
		return guest;
	});
	guests = await Promise.all(guests);

	guests = results.map(async guest => {
		if (guest.newestPeriod) {
			let period = await db.collection("periods").findOne({ _id: mongo.ObjectId(guest.newestPeriod.period) });
			// console.log(period);
			guest["newestPeriod"] = period;
			if (guest.newestPeriod) {
				guest.guestState = "CONFIRMED GUEST";
			}
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
	guests = await Promise.all(guests);
	console.log(guests);
	res.json(guests);
});

// add / insert one guest
app.post('/guests', (req, res) => {
	let data = req.body;
	console.log(data);
	res.statusCode = 201;
	res.setHeader('Location', '/guests');
	res.send();
});


// route or path: /guest/:id

// get one guest
app.get('/guest/:id', (req, res) => {
	let guestId = req.params.id;
	let guest = storage.Guest.filter(item => item.ObjectId == guestId)[0];
	res.send(guest);
});

// delete one guest
app.delete('/guest/:id', (req, res) => {
	let guestId = req.params.id;
	res.statusCode = 204;
	res.setHeader('Location', '/guest/' + guestId);
	res.send();
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
	let db = await connect();
	let cursor = await db.collection("notes").find();
	let results = await cursor.toArray();
	res.json(results);
	// res.send(storage.Note);
});

// add / insert one note
app.post('/notes', (req, res) => {
	let data = req.body;
	console.log(data);
	res.statusCode = 201;
	res.setHeader('Location', '/notes');
	res.send();
});


// route or path: /note/:id

// get one note
app.get('/note/:id', (req, res) => {
	let noteId = req.params.id;
	let note = storage.Note.filter(item => item.ObjectId == noteId)[0];
	res.send(note);
});

// delete one note
app.delete('/note/:id', (req, res) => {
	let noteId = req.params.id;
	res.statusCode = 204;
	res.setHeader('Location', '/note/' + noteId);
	res.send();
});

// update one note using patch
app.patch('/note/:id', (req, res) => {
	let noteId = req.params.id;
	let data = req.body;
	console.log(data);
	res.statusCode = 200;
	res.setHeader('Location', '/note/' + noteId);
	res.send();
});

// update one note using put
app.put('/note/:id', (req, res) => {
	let noteId = req.params.id;
	let data = req.body;
	if (
			!data.header || !data.body || data.important==null
			|| Object.keys(data).length != 4
		) {
		res.statusCode = 400;
		return res.send();
	}
	console.log(data);
	res.statusCode = 200;
	res.setHeader('Location', '/note/' + noteId);
	res.send();
});



// =============== ToDoList ===============


// route or path: /todolists

// get all to do lists
app.get('/todolists', async (req, res) => {
	let db = await connect();
	let cursor = await db.collection("todolists").find();
	let results = await cursor.toArray();
	res.json(results);
	// res.send(storage.ToDoList);
});

// add / insert one to do list
app.post('/todolists', (req, res) => {
	let data = req.body;
	console.log(data);
	res.statusCode = 201;
	res.setHeader('Location', '/todolists');
	res.send();
});


// route or path: /todolist/:id

// get one to do list
app.get('/todolist/:id', (req, res) => {
	let toDoListId = req.params.id;
	let toDoList = storage.ToDoList.filter(item => item.ObjectId == toDoListId)[0];
	res.send(toDoList);
});

// delete one to do list
app.delete('/todolist/:id', (req, res) => {
	let toDoListId = req.params.id;
	res.statusCode = 204;
	res.setHeader('Location', '/todolist/' + toDoListId);
	res.send();
});

// update one to do list using patch
app.patch('/todolist/:id', (req, res) => {
	let toDoListId = req.params.id;
	let data = req.body;
	console.log(data);
	res.statusCode = 200;
	res.setHeader('Location', '/todolist/' + toDoListId);
	res.send();
});

// update one to do list using put
app.put('/todolist/:id', (req, res) => {
	let toDoListId = req.params.id;
	let data = req.body;
	if (
			!data.title || !data.type || !data.date || !data.items || data.items.length==0 || data.completed==null
			|| Object.keys(data).length != 6
		) {
		res.statusCode = 400;
		return res.send();
	}
	console.log(data);
	res.statusCode = 200;
	res.setHeader('Location', '/todolist/' + toDoListId);
	res.send();
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
