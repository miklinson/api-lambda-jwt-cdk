const jwt = require('jsonwebtoken');
exports.handler = async function (event, context) {
    responseBody = JSON.stringify(event);
    console.log(responseBody);
    let response = {
        statusCode: 200,
        body: responseBody
    };
    return response;
}