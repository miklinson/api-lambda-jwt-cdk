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
    let accessSecret = process.env.ACCESS_TOKEN_SECRET;
    let refreshSecret = process.env.REFRESH_TOKEN_SECRET;
    let expireTime = parseInt(process.env.EXPIRES_IN, 10); //convert string to int
    let expires = { expiresIn: expireTime }
    //Create an acess token
    let accessToken = jwt.sign(user, accessSecret, expires);
    //Create a refresh token
    let refreshToken = jwt.sign(user, refreshSecret); // no expiration for refresh token
    //Create response body
    let responseBody = {
        access_token: accessToken,
        refresh_token: refreshToken,
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
