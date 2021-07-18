const jwt = require('jsonwebtoken');
exports.handler = async function (event, context) {
    responseBody = JSON.stringify(event);
    console.log(responseBody);
    let response = {
        statusCode: 200,
        headers: {
            "x-custom-header": "custom-header-value"
        },
        body: responseBody
    };
    return response;
}