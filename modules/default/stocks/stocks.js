Module.register("stocks", {
	defaults: {
		stockProvider: "",
		percentDisplay: null,
		title: "Test",
		updateInterval: 60 * 1000,
		initialLoadDelay: 0
	},

	stockProvider: "realtimefinance",

	firstEvent: null,

	getStyles: function () {
		return ["font-awesome.css", "stock-icons.css", "stocks.css"];
	},

	getScripts: function () {
		return ["moment.js", this.file("../utils.js"), "stocksutils.js", "stockprovider.js", "stocksobject.js", this.file("providers/" + this.config.stockProvider.toLowerCase() + ".js")];
	},

	getHeader: function () {
		if (this.config.appendLocationNameToHeader && this.stockProvider) {
			if (this.data.header) return this.data.header + " " + this.stockProvider.fetchedLocation();
			else return this.stockProvider.fetchedLocation();
		}

		return this.data.header ? this.data.header : "";
	},

	start: function () {
		moment.locale(this.config.lang);

		this.stockProvider = StockProvider.initialize(this.config.stockProvider, this);

		this.stockProvider.start();

		this.scheduleUpdate(this.config.initialLoadDelay);
	},

	notificationReceived: function (notification, payload, sender) {
		if (notification === "CALEDNAR_EVENTS") {
			const senderClasses = sender.data.classes.toLowerCase().split(" ");
			if (senderClasses.indexOf(this.config.calendarClass.toLowerCase()) !== -1) {
				this.firstEvent = null;
				for (let event of payload) {
					if (event.location || event.geo) {
						this.firstEvent = event;
						Log.debug("First upcoming event with location: ", event);
						break;
					}
				}
			}
		} else if (notification === "PERCENT_DISPLAY") {
			this.percentDisplay = true;
			this.updateDom(300);
		}
	},

	getTemplate: function () {
		Log.log("Stock template data");
		switch (this.config.type.toLowerCase()) {
			case "chart":
				return "chart.njk";
			case "normal":
				return "stocks.njk";
			default:
				return "stocks.njk";
		}
	},

	getTemplateData: function () {
		Log.log("Getting stock template data: ", this.stockProvider.currentStock());
		const stock = this.stockProvider.stockForecast();

		return {
			config: this.config,
			currentStockObject: this.stockProvider.currentStock()
		};
	},

	updateAvaliable: function () {
		Log.log("New stock information avaliable.");

		this.updateDom(0);
		this.scheduleUpdate();
		if (this.StockProvider.currentStock()) {
			this.sendNotification("CURRENT_STOCK");
		}
		const notificationPayload = {
			currentStock: this.stockProvider.currentStock
		};
		this.sendNotification("STOCK_UPDATED");
	},

	scheduleUpdate: function (delay = null) {
		Log.log("Config type: " + this.config.type);
		let nextLoad = this.config.updateInterval;
		if (delay !== null && delay >= 0) {
			nextLoad = delay;
		}

		setTimeout(() => {
			switch (this.config.type.toLowerCase()) {
				case "normal":
					this.stockProvider.fetchCurrentStock();
					break;
				default:
					Log.error(`Invalid type ${this.config.type} configured`);
			}
		}, nextLoad);
	}
});
