module.exports = {
	User: [
		{
			ObjectId: 111,
			username: "ihorvat",
			password: "hash-hash-hash",
			email: "ivan.horvat@gmail.com",
			firstName: "Ivan",
			lastName: "Horvat",
			privateAccomodations: [
				111,
				211
			],
			addresses: [
				111,
				211
			],
			reservations: [
				111,
				211
			],
			periods: [
				111,
				211
			],
			notes: [
				111,
				211,
				311
			],
			toDoLists: [
				111,
				211
			]
		},
		{
			ObjectId: 111,
			username: "iivic",
			password: "hash-hash-hash",
			email: "ivo.ivic@gmail.com",
			firstName: "Ivo",
			lastName: "Ivic",
			privateAccomodations: [],
			addresses: [],
			reservations: [],
			periods: [],
			notes: [],
			toDoLists: []
		}
	],
	PrivateAccomodation: [
		{
			ObjectId: 111,
			name: "Apartment Nature",
			categoryStarNumber: 3,
			maxGuestNumber: 6,
			currentState: "AVAILABLE",
			location: 111,
			hasYard: true,
			lowestFloor: 0,
			numberofFloors: 1
		},
		{
			ObjectId: 211,
			name: "Apartment Marie",
			categoryStarNumber: 4,
			maxGuestNumber: 4,
			currentState: "OCCUPIED",
			location: 111,
			hasYard: false,
			lowestFloor: 1,
			numberofFloors: 2
		}
	],
	Address: [
		{
			ObjectId: 111,
			street: "Stancija Peličeti",
			houseNumber: 163,
			entranceNumber: 1,
			postalNumber: 52100,
			city: "Pula"
		},
		{
			ObjectId: 211,
			street: "Kolodvorska",
			houseNumber: 16,
			entranceNumber: 4,
			postalNumber: 52100,
			city: "Pula"
		}
	],
	Reservation: [
		{
			ObjectId: 111,
			period: 111,
			madeByGuest: 111,
			guests: [
				111,
				111,
				111
			],
			currentState: "CONFIRMED",
			price: {
				value: 1000,
				currency: "EUR",
				valueInEur: 1000
			}
		},
		{
			ObjectId: 211,
			period: 211,
			madeByGuest: 211,
			guests: [
				211,
				211,
				211
			],
			currentState: "INQUIRY",
			price: {
				value: 3500,
				currency: "HRK",
				valueInEur: 1000
			}
		}
	],
	Period: [
		{
			ObjectId: 111,
			startDate: "2022-07-04",
			endDate: "2022-07-15"
		},
		{
			ObjectId: 211,
			startDate: "2022-08-01",
			endDate: "2022-08-14"
		}
	],
	Guest: [
		{
			ObjectId: 111,
			firstName: "Hans",
			lastName: "Muller",
			email: "hmuller@gmail.com",
			phoneNumber: "+46 000 0000",
			country: "Njemačka",
			city: "Munchen"
		},
		{
			ObjectId: 211,
			firstName: "Marie",
			lastName: "Bishop",
			email: "mbishop@gmail.com",
			phoneNumber: "+46 111 1111",
			country: "Velika Britanija",
			city: "London"
		}
	],
	Note: [
		{
			ObjectId: 111,
			header: "Porez",
			body: "Treba platiti porez do 20.7.",
			important: true
		},
		{
			ObjectId: 211,
			header: "Sezona",
			body: "Počinje 1.6. a završava 31.8.",
			important: false
		},
		{
			ObjectId: 311,
			header: "Košnja trave",
			body: "Treba pokositi travu prije dolaska prvih gostiju",
			important: true
		}
	],
	ToDoList: [
		{
			ObjectId: 111,
			title: "Čišćenje",
			type: "repeating",
			date: "2022-08-05",
			items: [
				{
					ObjectId: 111,
					name: "Očistiti kuhinju",
					completed: true
				},
				{
					ObjectId: 112,
					name: "Očistiti kupaonicu",
					completed: false
				}
			],
			completed: false
		},
		{
			ObjectId: 211,
			title: "Popravak štete",
			type: "one-time",
			date: "2022-06-01",
			items: [
				{
					ObjectId: 111,
					name: "Ofarbati zidove",
					completed: true
				},
				{
					ObjectId: 112,
					name: "Zamijeniti razbijene čaše",
					completed: true
				}
			],
			completed: true
		}
	]
};