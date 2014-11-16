(function($) {
    $(function() {
	function populate(api) {
    	    $('#container').empty();
    	    $(window).off();
    	    if (api === 'github') {
		$('#container').gluttony({
    		    endpoint: 'https://api.github.com/search/repositories',
    		    keyPath: 'data.items',
    		    params: {
    			q: 'language:javascript',
    			per_page: 100,
    			sort: 'stars'	    
    		    },
		    paginate: 'page'
		}, function(child) {
    		    var html = '';
    		    html += '<h2><a target="_blank" href="' + child.html_url + '">' + child.owner.login + '/' + child.name + '</a></h2>';
    		    html += '<p>' + child.description + '</p>';
    		    html += '<p class="subtitle"><span class="octicon octicon-star"></span> ' + child.stargazers_count + ' <span class="octicon octicon-repo-forked"></span> ' + child.forks + '</p>';
    		    html += '<img src="' + child.owner.avatar_url + '">';
    		    return html;
		});	    
    	    } else if (api === 'flickr') {
		$('#container').gluttony({
    		    endpoint: 'https://api.flickr.com/services/rest/?method=flickr.photos.search',
    		    keyPath: 'photos.photo',
    		    params: {
    			text: 'autumn',
    			api_key: 'c89ceff941eb0fc822a1b2e61470522b',
			format: 'json',
			per_page: '100'
    		    },
		    paginate: 'page',
		    jsonpCallback: 'jsonFlickrApi'
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
    		    paginate: {before: 'timestamp'},
    		    params: {
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
    		    paginate: {after: 'data.name'},
    		    jsonp: 'jsonp',
    		    params: {
    			limit: 100
    		    }
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

	var $docToggle = $('#doc-toggle');
	var $documentation = $('div.documentation');
	$docToggle.on('click', function(e) {
	    e.preventDefault();
	    $documentation.toggleClass('show');
	    if ($documentation.hasClass('show')) {
		$docToggle.text('Hide documentation');
	    } else {
		$docToggle.text('Show documentation');
	    }
	});
    });
})(jQuery);
