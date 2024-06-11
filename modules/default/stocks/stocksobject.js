class StockObject {
	constructor() {
		(this.title = "Test"), (this.date = null), (this.type = null);
		this.symbol = null;
		this.price = null;
		this.previous_close = null;
		this.change = null;
		this.change_percent = null;
		this.pre_or_post_market = null;
		this.pre_or_post_market_change = null;
		this.last_update = null;
		this.stockColor = null;
		this.lastDay = null;
		this.lastMonth = null;
		this.lastYear = null;
		this.quoteChanges = null;
		this.lastTrade = null;
		this.previousDay = null;
	}

	priceColor() {
		if (this.change > 0) {
			this.stockColor = "green";
		} else if (this.change < 0) {
			this.stockColor = "red";
		} else {
			this.stockColor = "teststestststst";
		}
	}

	isMarketOpen() {
		// check if market is open
	}
}

if (typeof module !== "undefined") {
	module.exports = StockObject;
}
