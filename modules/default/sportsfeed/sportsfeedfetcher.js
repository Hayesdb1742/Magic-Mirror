const Log = require("logger");
const FeedMe = require("feedme");
const NodeHelper = require("node_helper");
const fetch = require("fetch");
const iconv = require("iconv-lite");
const stream = require("stream");
const { clear } = require("console");

const SportsfeedFetcher = function (url, reloadInterval, encoding, logFeedWarnings, useCorsProxy) {
	let reloadTimer = null;
	let items = [];

	let fetchFailedCallback = function () {};
	let itemsReceivedCallback = function () {};

	if (reloadInterval < 1000) {
		reloadInterval = 1000;
	}

	const fetchSports = () => {
		clearTimeout(reloadTimer);
		reloadTimer = null;
		items = [];

		const parser = new FeedMe();

		parser.on("item", (item) => {
			const title = item.title;
			let description = item.description || item.summary || item.content || "";
			const pubdate = item.pubdate || item.published || item.updated || item["ds:date"];
			const url = item.url || item.link || "";

			if (title && pubdate) {
				const regex = /(<([^>]+)>)/gi;
				description = description.toString().replace(regex, "");

				items.push({
					title: title,
					description: description,
					pubdate: pubdate,
					url: url,
					useCorsProxy: useCorsProxy
				});
			} else if (logFeedWarnings) {
				Log.warn("Can't parse feed item:");
				Log.warn(item);
				Log.warn("Title: " + title);
				Log.warn("Description: " + description);
				Log.warn("Pubdate: " + pubdate);
			}
		});

		parser.on("end", () => {
			this.broadcastItems();
			scheduleTimer();
		});

		parser.on("error", (error) => {
			fetchFailedCallback(this, error);
			scheduleTimer();
		});

		parser.on("ttl", (minutes) => {
			try {
				const ttlms = Math.min(minutes * 60 * 1000, 86400000);
				if (ttlms > reloadInterval) {
					reloadInterval = ttlms;
					Log.info("Sportsfeed-Fetcher: reloadInterval set to ttl=" + reloadInterval + " for url " + url);
				}
			} catch (error) {
				Log.warn("Sportsfeed-Fetcher: feed ttl is no valid integer=" + minutes + " for url " + url);
			}
		});
		const nodeVersion = Number(process.version.match(/^v(\d+\.\d+)/)[1]);
		const headers = {
			"User-Agent": "Mozilla/5.0 (Node.js " + nodeVersion + ") MagicMirror/" + global.version,
			"Cache-Control": "max-age=0, no-cache, no-store, must-revalidate",
			Pragma: "no-cache"
		};

		fetch(url, { headers: headers })
			.then(NodeHelper.checkFetchStatus)
			.then((response) => {
				let nodeStream;
				if (response.body instanceof stream.Readable) {
					nodeStream = response.body;
				} else {
					nodeStream = stream.Readable.fromWeb(response.body);
				}
				nodeStream.pipe(iconv.decodeStream(encoding)).pipe(parser);
			})
			.catch((error) => {
				fetchFailedCallback(this, error);
				scheudleTimer();
			});
	};

	const scheduleTimer = function () {
		clearTimeout(reloadTimer);
		reloadTimer = setTimeout(function () {
			fetchSports();
		}, reloadInterval);
	};

	this.setReloadInterval = function (interval) {
		if (interval > 1000 && interval < reloadInterval) {
			reloadInterval = interval;
		}
	};

	this.startFetch = function () {
		fetchSports();
	};

	this.broadcastItems = function () {
		if (items.length <= 0) {
			Log.info("Sportsfeed-Fetcher: No items to broadcast yet.");
			return;
		}
		Log.info("Sportsfeed-Fetcher: Broadcasting " + items.length + " items.");
		itemsReceivedCallback(this);
	};

	this.onReceive = function (callback) {
		itemsReceivedCallback = callback;
	};

	this.onError = function (callback) {
		fetchFailedCallback = callback;
	};

	this.url = function () {
		return url;
	};

	this.items = function () {
		return items;
	};
};

module.exports = SportsfeedFetcher;
