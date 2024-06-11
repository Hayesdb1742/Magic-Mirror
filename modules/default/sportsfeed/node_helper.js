const NodeHelper = require("node_helper");
const SportsfeedFetcher = require("./sportsfeedfetcher.js");
const Log = require("logger");

module.exports = NodeHelper.create({
	start: function () {
		Log.log("Starting node helper for: " + this.name);
		this.fetchers = [];
	},

	socketNotificationReceived: function (notification, payload) {
		Log.log("sports feed: " + notification);
		if (notification === "ADD_SPORTS_FEED") {
			this.createFetcher(payload.feed, payload.config);
		}
	},

	createFetcher: function (feed, config) {
		const url = feed.url || "";
		const encoding = feed.encoding || "UTF-8";
		const reloadInterval = feed.reloadInterval || config.reloadInterval || 5 * 60 * 1000;
		let useCorsProxy = feed.useCorsProxy;
		if (useCorsProxy === undefined) useCorsProxy = true;

		try {
			new URL(url);
		} catch (error) {
			Log.error("Sportsfeed Error. Malformed sportsfeed url: ", url, error);
			this.sendSocketNotification("SPORTSFEED_ERROR", { error_type: "MODULE_ERROR_MALFORMED_URL" });
			return;
		}

		let fetcher;
		if (typeof this.fetchers[url] === "undefined") {
			Log.log("Create new sportsfetcher for url: " + url + " - Interval: " + reloadInterval);
			fetcher = new SportsfeedFetcher(url, reloadInterval, encoding, config.logFeedWarnings, useCorsProxy);

			fetcher.onReceive(() => {
				Log.log("Sports fetcher is working");
				this.broadcastFeeds();
			});

			fetcher.onError((fetcher, error) => {
				Log.error("Sportsfeed error", url, error);
				let error_type = NodeHelper.checkFetchError(error);
				this.sendSocketNotification("SPORTSFEED_ERROR", {
					error_type
				});
			});

			this.fetchers[url] = fetcher;
		} else {
			Log.log("Use existing sports for url" + url);
			fetcher = this.fetchers[url];
			fetcher.setReloadInterval(reloadInterval);
			fetcher.broadcastItems();
		}

		fetcher.startFetch();
	},

	broadcastFeeds: function () {
		const feeds = {};
		for (let f in this.fetchers) {
			feeds[f] = this.fetchers[f].items();
		}
		Log.log("Sending sports socket notification");
		this.sendSocketNotification("SPORTS_ITEMS", feeds);
	}
});
