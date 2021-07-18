const jwt = require('jsonwebtoken');
exports.handler = async function (event, context) {
    responseBody = event.body;
    console.log(responseBody);
    let response = {
        statusCode: 200,
        body: responseBody
    };
    return response;
}