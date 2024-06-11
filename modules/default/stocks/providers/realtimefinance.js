StockProvider.register("realtimefinance", {
	providerName: "realtimefinance",

	defaults: {
		apiVersion: "1.0",
		apiBase: "https://api.finazon.io/latest",
		snapshotEndpoint: "/ticker/snapshot",
		apiKey: "cdc72b2375d641aea7d5c0ea47caf589lr"
	},

	fetchCurrentStock() {
		Log.log("Fetching current stock");
		this.fetchData(this.getUrl())
			.then((data) => {
				let currentStock;
				if (this.config.stockEndpoint === "/ticker/snapshot") {
					currentStock = this.generateStockObjectsFromCurrentStock(data);
				} else {
					currentStock = this.generateStockObjectsFromCurrentStock(data);
				}
				Log.log("Current stock object: ", currentStock);
				this.setCurrentStock(currentStock);
			})
			.catch(function (request) {
				Log.error("Could not load data ... ", request);
			})
			.finally(() => this.updateAvaliable());
	},

	generateStockObjectsFromCurrentStock(currentStockData) {
		const currentStock = new StockObject();
		//"The requested dataset 'us_stocks_essentialticker=undefinedapikey=' does not exist or could not be found."
		Log.log("Current stock data: ", currentStockData);
		currentStock.lastDay = currentStockData["1d"];
		Log.log("Last day" + currentStock.lastDay["o"]);
		currentStock.lastMonth = currentStockData["1m"];
		currentStock.lastYear = currentStockData["52w"];
		currentStock.quoteChanges = currentStockData["ch"];
		currentStock.lastTrade = currentStockData["lt"];
		currentStock.previousDay = currentStockData["p1d"];

		return currentStock;
	},

	getUrl() {
		let urlString = this.config.apiBase + this.config.snapshotEndpoint + this.getParams();
		Log.log("APIString: " + urlString);
		return urlString;
	},

	getParams() {
		Log.log("API KEY" + this.config.apiKey);
		let params = "?";
		params += "apikey=" + "cdc72b2375d641aea7d5c0ea47caf589lr";
		if (this.config.snapshotEndpoint === "/ticker/snapshot") {
			// need dataset and ticker params
			let dataset = "us_stocks_essential";
			let ticker = this.config.ticker;
			params += "&dataset=" + dataset;
			params += "&ticker=" + "NVDA";
		} else {
			this.hide(this.config.animationSpeed, { lockString: this.identifier });
			return;
		}
		return params;
	},

	setConfig(config) {
		Log.log("Class config is set");
		this.config = config;
		this.config.stockEndpoint = "/ticker/snapshot";
	}
});
