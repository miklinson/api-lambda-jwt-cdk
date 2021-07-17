const jwt = require('jsonwebtoken');
exports.handler = async function (event, context) {
    //Authenticate Users
    let response = {
        statusCode: 200,
        headers: {
            "x-custom-header": "custom-header-value"
        },
        body: JSON.stringify(event)
    };
    return response;
}
