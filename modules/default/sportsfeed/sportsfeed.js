Module.register("sportsfeed", {
	defaults: {
		feeds: [
			{
				title: "ESPN",
				url: "https://www.espn.com/espn/rss/news",
				encoding: "UTF-8"
			}
		],
		showAsList: false,
		showSourceTitle: true,
		showPublishDate: true,
		broadcastSportsFeeds: true,
		broadcastSportsUpdates: true,
		showDescription: false,
		showTitleAsUrl: false,
		wrapTitle: true,
		wrapDescription: true,
		truncDescription: true,
		lengthDescription: 400,
		hideLoading: false,
		reloadInterval: 5 * 60 * 1000, // every 5 minutes
		updateInterval: 10 * 1000,
		animationSpeed: 2.5 * 1000,
		maxSportsItems: 0, // 0 for unlimited
		ignoreOldItems: false,
		ignoreOlderThan: 24 * 60 * 60 * 1000, // 1 day
		removeStartTags: "",
		removeEndTags: "",
		startTags: [],
		endTags: [],
		prohibitedWords: [],
		scrollLength: 500,
		logFeedWarnings: false,
		dangerouslyDisableAutoEscaping: false
	},

	getUrlPrefix: function (item) {
		if (item.useCorsProxy) {
			return location.protocol + "//" + location.host + "/cors?url=";
		} else {
			return "";
		}
	},

	getScripts: function () {
		return ["moment.js"];
	},

	getStyles: function () {
		return ["sportsfeed.css"];
	},

	getTranslations: function () {
		return false;
	},

	start: function () {
		Log.log("Starting module: " + this.name);

		moment.locale(config.language);

		this.sportsItems = [];
		this.loaded = false;
		this.error = null;
		this.activeItem = 0;
		this.scrollPosition = 0;
		console.log("starting module for sports");
		this.registerFeeds();

		this.isShowingDescription = this.config.showDescription;
	},

	socketNotificationReceived: function (notification, payload) {
		Log.log("Sports: " + notification);
		if (notification === "SPORTS_ITEMS") {
			this.generateFeed(payload);

			if (!this.loaded) {
				if (this.config.hideLoading) {
					this.show();
				}
				this.scheduleUpdateInterval();
			}

			this.loaded = true;
			this.error = null;
		} else if (notification === "SPORTSFEED_ERROR") {
			this.error = this.translate(payload.error_type);
			this.scheduleUpdateInterval();
		} else {
			Log.error("Notification Error: " + notification);
		}
	},

	getTemplate: function () {
		if (this.config.feedUrl) {
			return "oldconfig.njk";
		} else if (this.config.showFullArticle) {
			return "fullarticle.njk";
		}
		return "sportsfeed.njk";
	},

	getTemplateData: function () {
		if (this.config.showFullArticle) {
			return {
				url: this.getActiveItemURL()
			};
		}
		if (this.error) {
			return {
				error: this.error
			};
		}
		if (this.sportsItems.length === 0) {
			return {
				empty: true
			};
		}

		if (this.activeItem >= this.sportsItems.length) {
			this.activeItem = 0;
		}

		const item = this.sportsItems[this.activeItem];
		const items = this.sportsItems.map(function (item) {
			item.publishDate = moment(new Date(item.pubdate)).fromNow();
			return item;
		});

		return {
			loaded: true,
			config: this.config,
			sourceTitle: item.sourceTitle,
			publishDate: moment(new Date(item.pubdate)).fromNow(),
			title: item.title,
			url: this.getUrlPrefix(item) + item.url,
			description: item.description,
			items: items
		};
	},

	getActiveItemURL: function () {
		const item = this.sportsItems[this.activeItem];
		if (item) {
			return typeof item.url === "string" ? this.getUrlPrefix(item) + item.url : this.getUrlPrefix(item) + item.url.href;
		} else {
			return "";
		}
	},

	registerFeeds: function () {
		Log.log("Sports starting feeds");
		for (let feed of this.config.feeds) {
			this.sendSocketNotification("ADD_SPORTS_FEED", {
				feed: feed,
				config: this.config
			});
		}
	},

	generateFeed: function (feeds) {
		let sportsItems = [];
		for (let feed in feeds) {
			const feedItems = feeds[feed];
			if (this.subscribedToFeed(feed)) {
				for (let item of feedItems) {
					item.sourceTitle = this.titleForFeed(feed);
					if (!(this.config.ignoreOldItems && Date.now() - new Date(item.pubdate) > this.config.ignoreOlderThan)) {
						sportsItems.push(item);
					}
				}
			}
		}
		sportsItems.sort(function (a, b) {
			const dateA = new Date(a.pubdate);
			const dateB = new Date(b.pubdate);
			return dateB - dateA;
		});

		if (this.config.maxSportsItems > 0) {
			sportsItems = sportsItems.slice(0, this.config.maxSportsItems);
		}

		if (this.config.prohibitedWords.length > 0) {
			sportsItems = sportsItems.filter(function (item) {
				for (let word of this.config.prohibitedWords) {
					if (item.title.toLowerCase().indexOf(word.toLowerCase()) > -1) {
						return false;
					}
				}
				return true;
			}, this);
		}

		sportsItems.forEach((item) => {
			if (this.config.removeStartTags === "title" || this.config.removeStartTags === "both") {
				for (let startTag of this.config.startTags) {
					if (item.title.slice(0, startTag.length) === startTag) {
						item.description = item.description.slice(startTag.length, item.description.length);
					}
				}
			}
			if (this.config.removeStartTags === "description" || this.config.removeStartTags === "both") {
				if (this.isShowingDescription) {
					for (let startTag of this.config.startTag) {
						if (item.description.slice(0, startTag.length) === startTag) {
							item.description = item.description.slice(startTag.length, item.description.length);
						}
					}
				}
			}

			// get selected tags from rss
			if (this.config.removeEndTags) {
				for (let endTag of this.config.endTags) {
					if (item.title.slice(-endTag.length) === endTag) {
						item.description = item.descriptoion.slice(0, -endTag.length);
					}
				}

				if (this.isShowingDescription) {
					for (let endTag of this.config.endTags) {
						if (item.description.slice(-endTags.length) === endTag) {
							item.description = item.description.slice(0, -endTag.length);
						}
					}
				}
			}
		});

		const updatedItems = [];
		sportsItems.forEach((value) => {
			if (this.sportsItems.findIndex((value1) => value1 === value) === -1) {
				updatedItems.push(value);
			}
		});

		if (this.config.broadcastNewsUpdates && updatedItems.length > 0) {
			this.sendNotification("SPORTS_FEED_UPDATE", { items: updatedItems });
		}

		this.sportsItems = sportsItems;
	},

	subscribedToFeed: function (feedUrl) {
		for (let feed of this.config.feeds) {
			if (feed.url === feedUrl) {
				return true;
			}
		}
		return false;
	},

	titleForFeed: function (feedUrl) {
		for (let feed of this.config.feeds) {
			if (feed.url === feedUrl) {
				return feed.title || "";
			}
		}
	},

	scheduleUpdateInterval: function () {
		this.updateDom(this.config.animationSpeed);

		if (this.config.broadcastNewsFeeds) {
			this.sendNotification("SPORTS_FEED", { items: this.sportsItems });
		}

		if (this.timer) clearInterval(this.timer);

		this.timer = setInterval(() => {
			this.activeItem++;
			this.updateDom(this.config.animationSpeed);

			if (this.config.broadcastNewsFeeds) {
				this.sendNotification("SPORTS_FEED", { items: this.sportsItems });
			}
		}, this.config.updateInterval);
	},

	notificationReceived: function (notification, payload, sender) {
		Log.log("Sports notification: " + notification);
		const before = this.activeItem;
		if (notification === "MODULE_DOM_CREATED" && this.config.hideLoading) {
			this.hide();
		} else if (notification === "ARTICLE_NEXT") {
			this.activeItem++;
			if (this.activeItem >= this.sportsItems.length) {
				this.activeItem = 0;
			}
			this.resetDescOrFullArticleAndTimer();
			Log.debug(this.name + " - going from article #" + before + " to #" + this.activeItem + " (of " + this.newsItems.length + ")");
			this.updateDom(100);
		} else if (notification === "ARTICLE_MORE_DETAILS") {
			if (this.config.showFullArticle === true) {
				this.scrollPosition += this.config.scrollLength;
				window.scrollTo(9, this.scrollPosition);
				Log.debug(this.name + " - scrolling down");
				Log.debug(this.name + " - ARTICLE_MORE_DETAILS, scroll position: " + this.config.scrollLength);
			} else {
				this.showFullArticle();
			}
		} else if (notification === "ARTICLE_SCROLL_UP") {
			if (this.scrollPosition === true) {
				this.scrollPosition -= this.config.scrollLength;
				window.scrollTo(0, this.scrollPosition);
				Log.debug(this.name + " - scrolling up");
				Log.debug(this.name + " - ARTICLE_SCROLL_UP, scroll position: " + this.config.scrollLength);
			}
		} else if (notification === "ARTICLE_LESS_DETAILS") {
			this.resetDescOrFullArticleAndTimer();
			Log.debug(this.name + " - showing only article titles again");
			this.updateDom(100);
		} else if (notification === "ARTICLE_TOGGLE_FULL") {
			if (this.config.showFullArticle) {
				this.activeItem++;
				this.resetDescOrFullArticleAndTimer();
			} else {
				this.showFullArticle();
			}
		} else if (notification === "ARTICLE_INFO_REQUEST") {
			this.sendNotification("ARTICLE_INFO_RESPONE", {
				title: this.sportsItems[this.activeItem].title,
				source: this.sportsItems[this.activeItem].sourceTitle,
				date: this.sportsItems[this.activeItem].pubdate,
				desc: this.sportsItems[this.activeItem].description,
				url: this.getActiveItemURL()
			});
		}
	},

	showFullArticle: function () {
		this.isShowingDescription = !this.isShowingDescription;
		this.config.showFullArticle = !this.isShowingDescription;
		if (this.config.showFullArticle === true) {
			document.getElementsByClassName("region bottom bar")[0].classList.add("sportsfeed-fullarticle");
		}
		clearInterval(this.timer);
		this.timer = null;
		Log.debug(this.name + " - showing " + this.isShowingDescription ? "article description" : "full article");
		this.updateDom(100);
	}
});
