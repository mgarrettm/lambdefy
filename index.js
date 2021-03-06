'use strict';

var querystring = require('querystring');
var http;

var responseHeaders;

module.exports = function (port, options) {

    if (!options) options = {};

    http = options.https ? require('https') : require('http');

    var async = options.async;
    var ready = false;
    var queue = [];

    return function (event, context) {

        if (async && !ready) {
            if (event) {
                queue.push({
                    'event': event,
                    'context': context
                });
            } else {
                ready = true;
                queue.forEach(function (item) {
                    handle(port, item.event, item.context);
                });
            }
            return;
        }

        handle(port, event, context);
    }
}

function handle(port, event, context) {

    if (!responseHeaders) responseHeaders = event.responseHeaders;

    var parts = [];
    for (var p = 0; 'p' + p.toString() in event.path; p++) {
        parts.push(event.path['p' + p.toString()]);
    }
    event.path = '/' + parts.join('/');

    event.query = querystring.stringify(event.query);
    if (event.query) {
        event.path += '?' + event.query;
    }

    var options = {
        hostname: 'localhost',
        port: port,
        method: event.method,
        path: event.path,
        headers: event.headers
    };

    console.log(options);

    var req = http.request(options, function (res) {

        res.setEncoding('utf8');

        var body = '';
        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            context.done(createError(res.statusCode, body, res.headers));
        });
    });

    req.on('error', function (error) {
        context.done(createError(500, JSON.stringify({
            message: error.message
        })));
    });

    if (event.method.substring(0, 1) === 'P') {
        req.write(event.body);
    }

    req.end();
}

function createError(statusCode, body, headers) {

    if (headers === undefined) headers = {
        "content-length": body.length.toString(),
        "content-type": "application/json; charset=utf-8",
        "connection": "keep-alive",
        "date": Date.now().toString()
    };

    body = new Buffer(body).toString('base64');

    var error = new Error(statusCode.toString() + body);

    var values = responseHeaders.map(function (header) {
        return headers[header] || '';
    });
    error.stack = '\n' + values.join('\n');

    return error;
}