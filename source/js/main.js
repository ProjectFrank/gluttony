//= require "ratelimiter"

var responseContainer;

(function($) {
    $.fn.gluttony = function(rawSettings, template) {

	var nodeBank = [];
	
	function determineAPI(endpoint) {
	    if (/api\.flickr\.com/.test(endpoint)) {
		return 'flickr';
	    } else if (/googleapis\.com\/youtube/.test(endpoint)) {
		return 'youtube';
	    } else if (/api\.github\.com/.test(endpoint)) {
		return 'github';
	    } else if (/api\.tumblr\.com/.test(endpoint)) {
		return 'tumblr';
	    } else if (/reddit\.com.*\.json/.test(endpoint)) {
		return 'reddit';
	    }
	    else {
		throw 'Invalid/unsupported endpoint';
	    }
	}

	function deposit(bank, newChildren) {
	    return bank.concat($.map(newChildren, function(child) {
		var html = template(child);
		if (!html) {
		    return null;
		}
		return $('<div>').addClass('feed').html(html);
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

	var defaultSettings = {
	    endpoint: 'https://api.flickr.com/services/rest/?method=flickr.photos.search',
	    keyPath: 'photos.photo'
	};
	
	var settings = $.extend(defaultSettings, rawSettings);
	
	var api = determineAPI(settings.endpoint);

	var defaultParams;
	if (api == 'flickr') {
	    defaultParams = {
		sort: 'date-posted-desc',
		page: '1',
		per_page: '100',
		text: 'autumn',
		format: 'json'
	    };
	} else if (api == 'youtube') {
	    defaultParams = {
		part: 'snippet',
		safeSearch: 'moderate',
		maxResults: 50,
		type: 'video',
		videoEmbeddable: true,
		q: 'never gonna give you up'
	    }
	} else if (api == 'github') {
	    defaultParams = {
		q: 'language:javascript',
		order: 'desc',
		sort: 'stars',
		per_page: 100,
		page: 1
	    }
	} else if (api == 'tumblr') {
	    defaultParams = {
		tag: 'doge',
		filter: 'text'
	    }
	} else if (api == 'reddit') {
	    defaultParams = {
		limit: 100
	    }
	}
	
	// Object containing AJAX request parameters
	// Combine default parameters with given parameters
	var params = $.extend(defaultParams, settings.extraParams);

	var ajaxSettings;
	
	ajaxSettings = {
	    url: settings.endpoint,
	    type: 'GET',
	    data: params,
	    dataType: 'jsonp'
	};

	// Incorporate custom ajax settings depending on the api
	if (api == 'flickr') {
	    ajaxSettings.jsonpCallback = 'jsonFlickrApi';
	    ajaxSettings.success = function(response) {
		try {
		    children = findArray(response, settings.keyPath);
		} catch(e) {
		    console.error(e);
		}

		// nodeBank = nodeBank.concat($.map(children, function(child) {
		//     return $('<div>').addClass('feed').html(template(child));
		// }));
		nodeBank = deposit(nodeBank, children);

		params.page++;
	    };    
	} else if (api == 'youtube') {
	    ajaxSettings.success = function(response) {
		try {
		    children = findArray(response, settings.keyPath);
		} catch(e) {
		    console.error(e);
		}

		nodeBank = deposit(nodeBank, children);
		
		ajaxSettings.data.pageToken = response.nextPageToken;
	    };
	} else if (api == 'github') {
	    ajaxSettings.success = function(response) {
		try {
		    children = findArray(response, settings.keyPath);
		} catch(e) {
		    console.error(e);
		}

		nodeBank = deposit(nodeBank, children);

		ajaxSettings.data.page++;
	    }
	} else if (api == 'tumblr') {
	    ajaxSettings.success = function(response) {
		try {
		    children = findArray(response, settings.keypath);
		} catch(e) {
		    console.error(e);
		}

		nodeBank = deposit(nodeBank, children);

		ajaxSettings.data.before = response.response[19].timestamp;
	    }
	} else if (api == 'reddit') {
	    ajaxSettings.jsonp = 'jsonp',
	    ajaxSettings.success = function(response) {
		try {
		    children = findArray(response, settings.keypath);
		} catch(e) {
		    console.error(e);
		}

		nodeBank = deposit(nodeBank, children);
		ajaxSettings.data.after = children[children.length - 1].data.name;
	    }
	}
	
	var nodeBank = [];

	$target = this;
	
	function findArray(hash, keyPath) {
	    keys = settings.keyPath.split('.');
	    children = hash;
	    for (var i = 0; i < keys.length; i++) {
		children = children[keys[i]];
	    }
	    if (!(children instanceof Array)) {
		throw 'Object at specified keyPath is not an array.'
	    }
	    return children;
	}

	var ajaxActive = false;
	
	// Keep making ajax calls until nodeBank greater than or equal to numNodes
	function loadMoreNodes(deferred) {
	    ajaxActive = true;
	    $.ajax(ajaxSettings).done(function() {
		console.log(nodeBank.length, numNodes);
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
	var numNodes = 10;

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
	    console.log(begin);
	}
	
	var lastScroll = 0;
	$(window).on('scroll', handleScroll);
    };
    return this;
})(jQuery);

$(function() {
    function populate(api) {
	$('#container').empty();
	$(window).off();
	if (api === 'github') {
	    $('#container').gluttony({
	    	endpoint: 'https://api.github.com/search/repositories',
	    	keyPath: 'data.items',
	    	extraParams: {
	    	    q: 'language:javascript',
	    	    per_page: 100,
	    	    sort: 'stars'	    
	    	}
	    }, function(child) {
	    	var html = '';
	    	html += '<h2><a target="_blank" href="' + child.html_url + '">' + child.owner.login + '/' + child.name + '</a></h2>';
	    	html += '<p>' + child.description + '</p>';
	    	html += '<p class="subtitle"><span class="octicon octicon-star"></span> ' + child.stargazers_count + ' <span class="octicon octicon-repo-forked"></span> ' + child.forks + '</p>';
	    	html += '<img src="' + child.owner.avatar_url + '">';
	    	return html;
	    });	    
	} else if (api === 'youtube') {
	    $('#container').gluttony({
	    	endpoint: 'https://www.googleapis.com/youtube/v3/search',
	    	keyPath: 'items',
	    	extraParams: {
	    	    q: 'pokemon',
	    	    key: 'AIzaSyCRyUttQgorLXnBJq167KI2eze8L3P70xU',
	    	    order: 'date'
	    	}
	    }, function(child) {
	    	var html = '';
	    	html += '<h2>' + child.snippet.title + '</h2>';
	    	html += '<iframe width="420" height="315" src="http://www.youtube.com/embed/' + child.id.videoId + '" frameborder="0" allowfullscreen></iframe>';
	    	return html;
	    });	    
	} else if (api === 'flickr') {
	    $('#container').gluttony({
		endpoint: 'https://api.flickr.com/services/rest/?method=flickr.photos.search',
		keyPath: 'photos.photo',
	    	extraParams: {
	    	    text: 'autumn',
	    	    api_key: 'c89ceff941eb0fc822a1b2e61470522b'
	    	}
	    }, function(child) {
	    	var html = '';
		if (child.title) {
	    	    html += '<h2>' + child.title + '</h2>';
		}
	    	html += '<img src="https://farm' + child.farm + '.staticflickr.com/' + child.server + '/' + child.id + '_' + child.secret + '.jpg">';
	    	return html;
	    });	    
	} else if (api === 'tumblr') {
	    $('#container').gluttony({
		endpoint: 'http://api.tumblr.com/v2/tagged',
		keyPath: 'response',
		extraParams: {
		    api_key: 'fuiKNFp9vQFvjLNvx4sUwti4Yb5yGutBN4Xh10LXZhhRKjWlV4',
		    tag: 'doge'		    
		}
	    }, function(child) {
		if (!child.photos) {
		    return;
		}
		var html = '';
		
		html += '<h2><a target="_blank" href="' + child.post_url + '">' + child.blog_name + '</a></h2>';
		if (child.caption) {
		    html += '<p>' + child.caption + '</p>';
		}

		html += '<img src="' + child.photos[0].original_size.url + '">';
		return html;
	    });
	} else if (api === 'reddit') {
	    $('#container').gluttony({
		endpoint: 'http://www.reddit.com/r/aww.json',
		keyPath: 'data.children',
	    }, function(child) {
		if (!/\.(jpg|gif|png)$/.test(child.data.url)) {
		    return;
		}
		var html = '';

		html += '<h2><a target="_blank" href="' + child.data.url + '">' + child.data.title + '</a></h2>';
		html += '<p> Submitted by ' + child.data.author + '</p>';
		html += '<img src="' + child.data.url + '">';
		return html;
	    });
	}
    }
    var $select = $('select');
    populate($select.val());
    $select.on('change', function() {
	populate($(this).val());
    });
});
