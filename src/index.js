import express from 'express';
import storage from './storage.js'

const app = express();
const port = 3000;


// unfinished
app.get('/', (req, res) => {
	res.send(storage.User);
});


// =============== PrivateAccomodation ===============

// get all private accomodations
app.get('/privateaccomodations', (req, res) => {
	res.send(storage.PrivateAccomodation);
});

// get one private accomodation
app.get('/privateaccomodations/:id', (req, res) => {
	let privateAccomodationId = req.params.id;
	let privateAccomodation = storage.PrivateAccomodation.filter(item => item.ObjectId == privateAccomodationId)[0];
	res.send(privateAccomodation);
});

// get address of one private accomodation
app.get('/privateaccomodations/:id/address', (req, res) => {
	let privateAccomodationId = req.params.id;
	let privateAccomodation = storage.PrivateAccomodation.filter(item => item.ObjectId == privateAccomodationId)[0];
	let addressId = privateAccomodation.location;
	let address = storage.Address.filter(item => item.ObjectId == addressId)[0];
	res.send(address);
});


// =============== Address ===============

// get all addresses
app.get('/addresses', (req, res) => {
	res.send(storage.Address);
});

// get one address
app.get('/addresses/:id', (req, res) => {
	let addressId = req.params.id;
	let address = storage.Address.filter(item => item.ObjectId == addressId)[0];
	res.send(address);
});


// =============== Reservation ===============

// get all reservations
app.get('/reservations', (req, res) => {
	res.send(storage.Reservation);
});

// get one reservation
app.get('/reservations/:id', (req, res) => {
	let reservationId = req.params.id;
	let reservation = storage.Reservation.filter(item => item.ObjectId == reservationId)[0];
	res.send(reservation);
});

// get price of one reservation
app.get('/reservations/:id/guests', (req, res) => {
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

// get all periods
app.get('/periods', (req, res) => {
	res.send(storage.Period);
});

// get one period
app.get('/periods/:id', (req, res) => {
	let periodId = req.params.id;
	let period = storage.Period.filter(item => item.ObjectId == periodId)[0];
	res.send(period);
});


// =============== Guest ===============

// get all guests
app.get('/guests', (req, res) => {
	res.send(storage.Guest);
});

// get one guest
app.get('/guests/:id', (req, res) => {
	let guestId = req.params.id;
	let guest = storage.Guest.filter(item => item.ObjectId == guestId)[0];
	res.send(guest);
});


// =============== Note ===============

// get all notes
app.get('/notes', (req, res) => {
	res.send(storage.Note);
});

// get one note
app.get('/notes/:id', (req, res) => {
	let noteId = req.params.id;
	let note = storage.Note.filter(item => item.ObjectId == noteId)[0];
	res.send(note);
});


// =============== ToDoList ===============

// get all to do lists
app.get('/todolists', (req, res) => {
	res.send(storage.ToDoList);
});

// get one to do list
app.get('/todolists/:id', (req, res) => {
	let toDoListId = req.params.id;
	let toDoList = storage.ToDoList.filter(item => item.ObjectId == toDoListId)[0];
	res.send(toDoList);
});


app.listen(port, () => console.log(`Listening on port ${port}!`));
