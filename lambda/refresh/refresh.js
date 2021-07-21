const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async function (event, context) {
    //Init variables
    let ddbError, verifyError, parseError, noToken = false;
    let jwtDecoded, data, refreshToken;
    let response, responseBody = {};
    //Get refresh_token in body
    try {
        const body = JSON.parse(event.body);
        refreshToken = body.refresh_token;
    } catch (err) {
        parseError = true;
        responseBody = {
            "message": err.message
        }
    }
    if (parseError) return response(403, responseBody);

    const params = {
        TableName: 'token',
        Key: {
            refreshToken: refreshToken
        }
    }
    //Try catch block
    try {
        data = await getItem(params);
        if (!data.hasOwnProperty('Item')) {
            noToken = true;
            responseBody = {
                "message": "refresh token doesn't exist"
            }
        }
    } catch (err) {
        ddbError = true;
        responseBody = {
            message: err.message
        }
    }
    if (noToken) return response(403, responseBody); //no refreshToken found in DynamoDB
    if (ddbError) return response(403, responseBody); //cath error during DynamoDB action
    //If no error, get the sign details and then create new access token
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            verifyError = true;
            responseBody = {
                "message": err.message
            }
        } else {
            jwtDecoded = decoded.user;
        }
    });
    if (verifyError) return response(403, responseBody);

    //If JWT verification succeeded
    let user = { user: jwtDecoded };
    let accessSecret = process.env.ACCESS_TOKEN_SECRET;
    let expireTime = parseInt(process.env.EXPIRES_IN, 10); //convert string to int
    let expires = { expiresIn: expireTime };
    let accessToken = jwt.sign(user, accessSecret, expires);

    responseBody = {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: expireTime
    }
    return response(200, responseBody);
}

function response(statusCode, responseBody){
    return {
        statusCode: statusCode,
        body: JSON.stringify(responseBody)
    }
}

async function getItem(params) {
    try {
        return await docClient.get(params).promise()
    } catch (err) {
        return err
    }
}