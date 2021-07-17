const jwt = require('jsonwebtoken');
exports.handler = async function (event, context) {
    //Get Credentials
    let userCred = event.headers['Authorization'];
    //Check if authorization header exist and then replace
    let replaced = userCred && userCred.replace('Basic ', '');
    //Decode the credentials
    let data = new Buffer.from(replaced, 'base64').toString('ascii');
    let username = data.split(':')[0];
    //Prepare JWT details
    let user = { user: username };
    let secret = process.env.ACCESS_TOKEN_SECRET;
    let expireTime = process.env.EXPIRES_IN; //seconds
    let expires = { expiresIn: expireTime }
    //Create a token
    let accessToken = jwt.sign(user, secret, expires);
    let responseBody = {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: expireTime
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
