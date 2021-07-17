const jwt = require('jsonwebtoken');
exports.handler = async function (event, context) {
    //Get Credentials
    let userCred = event.headers['Authorization'];
    let replaced = userCred.replace('Basic ', '');
    //Decode the credentials
    let data = new Buffer.from(replaced, 'base64').toString('ascii');
    let username = data.split(':')[0];
    let user = { user: username };
    let secret = process.env.ACCESS_TOKEN_SECRET;
    //Create a token
    let accessToken = jwt.sign(user, secret, { expiresIn: '1h' });
    let responseBody = {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600
    };
    let response = {
        statusCode: 200,
        headers: {
            "x-custom-header": "custom-header-value"
        },
        body: JSON.stringify(responseBody)
    };
    return response;
}
