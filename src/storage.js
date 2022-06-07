export default {
	User: [
		{
			ObjectId: 111,
			email: "ivan.horvat@gmail.com",
			password: "hash-hash-hash",
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
			guests: [
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
			],
			analytics: 1111
		},
		{
			ObjectId: 111,
			email: "ivo.ivic@gmail.com",
			password: "hash-hash-hash",
			firstName: "Ivo",
			lastName: "Ivic",
			privateAccomodations: [],
			addresses: [],
			reservations: [],
			periods: [],
			notes: [],
			toDoLists: [],
			analytics: 1112
		}
	],
	PrivateAccomodation: [
		{
			ObjectId: 111,
			name: "Apartment Nature",
			categoryStarNumber: 3,
			maxGuestNumber: 6,
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
			start: "2022-07-04",
			end: "2022-07-15",
			privateAccomodation: 111
		},
		{
			ObjectId: 211,
			start: "2022-08-01",
			end: "2022-08-14",
			privateAccomodation: 111
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
			heading: "Porez",
			body: "Treba platiti porez do 20.7.",
			important: true
		},
		{
			ObjectId: 211,
			heading: "Sezona",
			body: "Počinje 1.6. a završava 31.8.",
			important: false
		},
		{
			ObjectId: 311,
			heading: "Košnja trave",
			body: "Treba pokositi travu prije dolaska prvih gostiju",
			important: true
		}
	],
	ToDoList: [
		{
			ObjectId: 111,
			title: "Čišćenje",
			date: "2022-08-05",
			items: [
				{
					ObjectId: 111,
					name: "Očistiti kuhinju",
					position: 0,
					completed: true
				},
				{
					ObjectId: 112,
					name: "Očistiti kupaonicu",
					position: 1,
					completed: false
				}
			],
			completed: false
		},
		{
			ObjectId: 211,
			title: "Popravak štete",
			date: "2022-06-01",
			items: [
				{
					ObjectId: 111,
					name: "Ofarbati zidove",
					position: 0,
					completed: true
				},
				{
					ObjectId: 112,
					name: "Zamijeniti razbijene čaše",
					position: 1,
					completed: true
				}
			],
			completed: true
		}
	],
	Analytics: {
		ObjectId: 1111,
		numberOfAccomodations: 3,
		numberOfReservations: {
			year2020: 5,
			year2021: 8,
			year2022: 7,
		},
		numberOfGuests: {
			year2020: 15,
			year2021: 38,
			year2022: 27,
		},
		earningsInEur: {
			year2020: {
				monthJune: 1500,
				monthJuly: 2500,
				monthAugust: 2000
			},
			year2021: {
				monthJune: 1000,
				monthJuly: 1200,
				monthAugust: 1250,
				monthSeptember: 120
			},
			year2022: {
				monthMay: 500,
				monthJune: 1000,
				monthJuly: 1000,
				monthAugust: 1400
			}
		}
	}
};