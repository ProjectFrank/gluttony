(function($) {
    var RateLimiter = {
	throttle: function(rawParams, func) {
	    var defaults = {delay: 200, no_trailing: false};
	    var params = $.extend(defaults, rawParams);    
	    var timer;
	    // If no_trailing false or unspecified
	    if (!params.no_trailing) {
		return function() {
		    var args = arguments;
		    debounce({delay: params.delay, at_begin: true}, function() {
			func.apply(this, args);
		    })();
		    
		    if (!timer) {
			timer = window.setTimeout(function() {
			    timer = null;
			    func.apply(this, args);
			}.bind(this), params.delay);
		    }
		}
	    }

	    // If no_trailing set to true
	    return function() {
		var args = arguments;
		if (!timer) {
		    func.apply(this, args);
		    timer = window.setTimeout(function() {
			timer = null;
		    }.bind(this), params.delay);
		}
	    }
	},

	debounce: function(rawParams, func) {
	    var defaults = {delay: 200, at_begin: false};
	    var params = $.extend(defaults, rawParams);
	    var timer;
	    if (!at_begin) {
		return function() {
		    window.clearTimeout(timer);
		    var args = arguments;
		    timer = window.setTimeout(function() {
			func.apply(this, args);
		    }.bind(this), params.delay);
		};
	    }

	    return function() {
		if (!timer) {
		    func.apply(this, arguments);
		    timer = window.setTimeout(function() {
			timer = null;
		    });
		} else {
		    window.clearTimeout(timer);
		}
	    };
	}
    }


    $.fn.gluttony = function(settings, template) {

	var nodeBank = [];

	function followKeyPath(hash, keyPath) {
	    keys = keyPath.split('.');
	    result = hash;
	    for (var i = 0; i < keys.length; i++) {
		result = result[keys[i]];
	    }
	    return result;
	}
	
	function paginate(param, children) {
	    if (typeof param == 'string') {
		if (ajaxSettings.data[param]) {
		    ajaxSettings[param]++;
		} else {
		    ajaxSettings.data[param] = 2;
		}
	    } else if (typeof param == 'object') {
		var paramName = Object.keys(param);
		if (paramName.length != 1) {
		    throw 'Param object must have exactly 1 key';
		}

		// Get param value from last child using given key path specified in param object
		paramValue = followKeyPath(children[children.length - 1], param[paramName[0]]);

		// Add key value pair to ajax parameters
		ajaxSettings.data[paramName[0]] = paramValue;
	    }
	}

	function deposit(bank, newChildren) {
	    return bank.concat($.map(newChildren, function(child) {
		var html = template(child);
		if (!html) {
		    return null;
		}
		return $('<div>').addClass('feed').append(html);
	    }));
	}

	var handleScroll = RateLimiter.throttle({delay: 20, no_trailing: true}, function() {
	    var scrollPosition = $(window).scrollTop()

	    // If unused nodes in array less than 50, load more of them
	    if (begin + numNodes + 1 > nodeBank.length - 50 && !ajaxActive) {
		loadMoreNodes();
	    }
	    
	    // If scroll down	    
	    if (scrollPosition > lastScroll) {
		var $secondLast = $('.feed').last().prev();
		if ($secondLast.length > 0 && begin + numNodes + 1 < nodeBank.length) {
		    var secondLastTop = $secondLast.offset().top;
		    var windowBottom = scrollPosition + $(window).height();
		    if (windowBottom > secondLastTop && begin + numNodes + 1 < nodeBank.length) {
			// Remove 5 from top, add 5 to bottom
			changeDOM(begin + 2);

			// Maintain scroll position
			window.scroll(0, $secondLast.offset().top - $(window).height());
		    }
		}
	    }
	    // If scroll up
	    else {
		var $second = $('.feed').first().next();
		if ($second.length > 0) {
		    var secondBottom = $second.offset().top + $second.height();
		    if (scrollPosition < secondBottom && begin > 0) {
			// Add 5 to top, remove 5 from bottom
			changeDOM(begin - 2);

			// Maintain scroll position
			window.scroll(0, $second.offset().top + $second.height());
		    }
		}
	    }
	    
	    // Update lastScroll
	    lastScroll = scrollPosition;
	});

	var ajaxSettings = {
	    url: settings.endpoint,
	    type: 'GET',
	    data: settings.params || {},
	    dataType: 'jsonp',
	    success: function(response) {
		children = followKeyPath(response, settings.keyPath);
		if (!(children instanceof Array)) {
		    throw 'Invalid keypath';
		}

		nodeBank = deposit(nodeBank, children);
		paginate(settings.paginate, children);
	    }
	};
	if (settings.jsonpCallback) {
	    ajaxSettings.jsonpCallback = settings.jsonpCallback;
	}
	if (settings.jsonp) {
	    ajaxSettings.jsonp = settings.jsonp;
	}
	
	
	$target = this;

	var ajaxActive = false;
	
	// Keep making ajax calls until nodeBank greater than or equal to numNodes
	function loadMoreNodes(deferred) {
	    ajaxActive = true;
	    $.ajax(ajaxSettings).done(function() {
		if (nodeBank.length < numNodes) {
		    loadMoreNodes(deferred);
		} else {
		    ajaxActive = false;
		    if (deferred) {
			deferred.resolve();
		    }
		}
	    });
	    if (deferred) {
		return deferred.promise();
	    }
	}
	
	loadMoreNodes($.Deferred()).done(function() {
	    $target.append(nodeBank.slice(begin, begin + numNodes));
	});

	var begin = 0;

	// Number of nodes to display in feed at any given time
	var numNodes = settings.numNodes || 10;

	// Update DOM to show different subset of elements from nodeBank
	function changeDOM(newBegin) {
	    // If new begin is negative, set newBegin to 0;
	    if (newBegin < 0) {
		newBegin = 0;
	    }

	    // If new begin is same as old begin, exit function
	    if (newBegin == begin) {
		return;
	    }
	    
	    var difference = newBegin - begin;
	    if (difference > 0) {
		// Remove from the top of the feed
		$target.find('.feed').slice(0, difference).remove();

		// Add to the bottom of the feed
		$target.append(nodeBank.slice(newBegin + numNodes - difference, newBegin + numNodes));
	    } else {
		// RECALL THAT difference IS NEGATIVE IN THIS CASE
		var $feed = $target.find('.feed');
		// Remove from bottom of the feed
		$feed.slice($feed.length + difference, $feed.length).remove();

		// Add to the top of the feed
		$target.prepend(nodeBank.slice(newBegin, newBegin - difference));
	    }
	    begin = newBegin;
	}
	
	var lastScroll = 0;
	$(window).on('scroll', handleScroll);
    };
    return this;
})(jQuery);
