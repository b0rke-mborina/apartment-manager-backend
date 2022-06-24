import axios from 'axios';

let AxiosServiceExchangeRates = axios.create({
	baseURL: 'https://api.apilayer.com/exchangerates_data',
	timeout: 3000,
});

export { AxiosServiceExchangeRates };