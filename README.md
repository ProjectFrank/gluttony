# Gluttony: Infinite Feed Plugin

[Live Demo](http://projectfrank.github.io/gluttony/)
## Getting Started

1. Create an empty container in your HTML document.
2. Create a jQuery selector that uniquely identifies your container. If your container is a `<div>` with an `id` of `container`, you might use `$('#container')`.
3. Generate the feed using `$('#container').gluttony()`. Be sure to refer to the section below for required options and arguments.

## Arguments

The `gluttony` method requires two arguments.

The first argument should be an object containing options for the feed which will be explained in the following section.

The second argument should be a function that returns an html string, array of html strings, element, array of elements, jQuery object, or array of jQuery objects representing the contents of each element in the feed. The function can take one argument which should represent an element from the array of interest inside the returned JSON file. If your function returns a falsy value, the array element will not be included in the feed.

For example, if you were working with the [reddit API](http://www.reddit.com/.json), you could refer to a post's title as `child.data.title`, assuming you named your function parameter `child`.

Example:

``` js
function(child) {
  if (!/\.(jpg|gif|png)$/.test(child.data.url)) {
    return;
  }
  var html = '';

  html += '<h2><a target="_blank" href="' + child.data.url + '">' + child.data.title + '</a></h2>';
  html += '<p> Submitted by ' + child.data.author + '</p>';
  html += '<img src="' + child.data.url + '">';
  return html;
}
```

## Options
Options must be an object and should be passed in as the first argument. The following are keys that can be used in such an object:

* `endpoint`: REQUIRED This should be a string of your endpoint's URL (e.g. http://reddit.com/.json)
* `keyPath`: REQUIRED This should be a string of property names separated by a `'.'` that will help the plugin locate the array of interest in the JSON file returned from your API. For example, if were were working with a [JSON file from the reddit API](http://reddit.com/.json), we would be interested in the value `children` array inside the `data` object. The `keyPath` in this case would be `'data.children'`.
* `paginate`: REQUIRED Refer to the documentation for your API. For APIs that paginate using something like `page=1`, you can set the value to the name of the pagination parameter (e.g. `'page'`) that should be incremented with each AJAX call. Other APIs may paginate by updating a parameter's value to be equal to one of the properties of the last element of the array of interest. For example, pagination on reddit is done by setting the `after` parameter to the value of the `name` property of the object referenced by the `data` property of the last element in the array of interest. In this case, the `paginate` property should reference an object containing a single key value pair. The key should be the name of the parameter that should be updated to paginate each AJAX call. The value should be a list of key path separated by `'.'` indicating the location within the last array element of the value that the pagination parameter should be updated to. In the case of reddit, the value of `paginate` would be set to `{after: 'data.name'}`.
* `params`: USUALLY REQUIRED This should be an object containing key value pairs that represent parameters and their values. This is similar to the object that would be assigned to the `data` property of the `settings` object used with the [jQuery.ajax() method](http://api.jquery.com/jquery.ajax/). Usage of this option will vary depending on the API being used. In order to reduce the number of AJAX calls made, it is advisable to set the parameter indicating the number of results per page to the maximum value allowed by the API.
* `numNodes`: OPTIONAL This should be set to an integer representing the number of posts the feed should display at any given moment. If this is omitted or falsy, the default value of 10 will be used.
* `jsonp`: OPTIONAL Similar to `jsonp` property of the settings object used by [jQuery.ajax()](http://api.jquery.com/jquery.ajax/). This should be a string indicating the parameter name used to specify to the API the name of the callback function that should be used to wrap the produced JSON. If unset, the default value of `'callback'` will be used. This option is necessary for APIs such as reddit where the name of the parameter used to specify the name of the callback function is `jsonp` as shown in the following request URL: `http://reddit.com/.json?jsonp=functionName`
* `jsonpCallback`: OPTIONAL Similar to the `jsonpCallback` property of the settings object used by [jQuery.ajax()](htt://api.jquery.com/jquery.ajax/). This should be a string indicating the name of the callback function to be used. This option is necessary for APIs such as Flickr where the callback name is `jsonFlickrApi` and there is no way to change it.

## Usage Examples
For reddit:

``` js
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
```

For Flickr:

``` js
$('#container').gluttony({
	endpoint: 'https://api.flickr.com/services/rest/?method=flickr.photos.search',
	keyPath: 'photos.photo',
	params: {
	    text: 'autumn',
	    api_key: 'some key',
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
```

For GitHub: 

``` js
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
```

For Tumblr:

``` js
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
```