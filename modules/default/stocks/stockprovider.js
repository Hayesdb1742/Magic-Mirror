/* global Class, performWebRequest */

/* MagicMirror²
 * Module: Weather
 *
 * By Michael Teeuw https://michaelteeuw.nl
 * MIT Licensed.
 *
 * This class is the blueprint for a weather provider.
 */

const StockProvider = Class.extend({
	providerName: "realtimefinance",
	defaults: {},

	currentStockObject: null,
	stockForecastArray: null,
	stockHourlyArray: null,
	fetchedLocationName: null,

	config: null,
	delegate: null,
	providerIdentifier: null,

	//Provider methods

	init: function (config) {
		this.config = config;
		Log.info(`Stock provider: ${this.providerName} initialized.`);
	},

	setConfig: function (config) {
		this.config = config;
		Log.info(`Stock provider: ${this.providerName} config set.`, this.config);
	},

	//Called when stock provider is about to start
	start: function () {
		Log.info(`Stock provider ${this.providerName} started.`);
	},

	// Start stock API request
	//overwrite in provider
	fetchCurrentStocks: function () {
		Log.warn(`Stock provider: ${this.providerName} does not subclass the fetchCurrentStock method.`);
	},

	fetchStockHourly: function () {},

	fetchStockHourly: function () {},

	// return stock object
	currentStock: function () {
		return this.currentStockObject;
	},

	stockForecast: function () {
		return this.stockForecast;
	},

	stockHourly: function () {
		return this.stockHourlyArray;
	},

	fetchedLocation: function () {
		return this.fetchedLocationName || "";
	},

	setCurrentStock: function (currentStockObject) {
		// Log.log("Setting current stock: ", currentStockObject);
		this.currentStockObject = currentStockObject;
		Log.log("Current stock object" + currentStockObject);
	},

	//set stock Hourly and Forecast

	setFetchedLocation: function (name) {
		this.fetchedLocationName = name;
	},

	updateAvaliable: function () {
		this.delegate.updateAvaliable(this);
	},

	fetchData: async function (url, type = "json", requestHeaders = undefined, expectedResponseHeaders = undefined) {
		Log.log("Stock provider fetching data");
		const mockData = this.config.mockData;
		if (mockData) {
			const data = mockData.substring(1, mockData.length - 1);
			return JSON.parse(data);
		}
		const useCorsProxy = typeof this.config.useCorsProxy !== "undefined" && this.config.useCorsProxy;
		return performWebRequest(url, type, useCorsProxy, requestHeaders, expectedResponseHeaders);
	}
});

StockProvider.providers = [];

StockProvider.register = function (providerIdentifier, providerDetails) {
	Log.log("Register stock feed: " + providerIdentifier);
	StockProvider.providers[providerIdentifier.toLowerCase()] = StockProvider.extend(providerDetails);
};

//Initialize new stock provider
StockProvider.initialize = function (providerIdentifier, delegate) {
	providerIdentifier = providerIdentifier.toLowerCase();

	const provider = new StockProvider.providers[providerIdentifier]();
	const config = Object.assign({}, provider.defaults, delegate.config);

	provider.delegate = delegate;
	provider.setConfig(config);

	provider.providerIdentifier = providerIdentifier;
	if (!provider.providerName) {
		provider.providerName = providerIdentifier;
	}
	return provider;
};
