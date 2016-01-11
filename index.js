const querystring = require('querystring');

var responseHeaders;

module.exports = function (port, https) {

    const http = https ? require('https') : require('http');

    return function (event, context) {

        console.log(event);

        if (!responseHeaders) responseHeaders = event.responseHeaders;
        
        event.path = gatewayToObject(event.path);
        event.query = gatewayToObject(event.query);
        event.headers = gatewayToObject(event.headers);

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
}

function createError(statusCode, body, headers) {

    body = new Buffer(body).toString('base64');

    if (headers === undefined) headers = {
        "content-length": body.length.toString(),
        "content-type": "application/json; charset=utf-8",
        "connection": "keep-alive",
        "date": Date.now().toString()
    };

    var error = new Error(statusCode.toString());

    var values = responseHeaders.map(function (header) {
        return headers[header] || '';
    });
    error.stack = 'Error\n' + body + '\n' + values.join('\n');

    return error;
}

function gatewayToObject (string) {

    var result = {};
    var string = string.slice(1,-1);

    if (string) {
        var parts = string.split(', ');
        console.log(parts);
        for (var i = 0; i < parts.length; i++) {
            var kv = parts[i].split('=');
            result[kv[0]] = kv[1];
        }
    }

    return result;
}