const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async function (event, context) {
    //Init variables
    let ddbError = false;
    let response = {};
    let responseBody = {};
    //Get refresh_token in body
    const body = JSON.parse(event.body);
    const refreshToken = body.refresh_token;
    const params = {
        TableName: 'token',
        Key: {
            refreshToken: refreshToken
        }
    }
    //Try catch block
    try {
        await getItem(params);
    } catch (err) {
        ddbError = true;
        response = {
            statusCode: 500,
            body: JSON.stringify(err)
        };
    }
    if (ddbError) return response;
    //If no error, get the sign details and then create new access token
    let decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    let username = decoded.user;
    let user = { user: username };
    let accessSecret = process.env.ACCESS_TOKEN_SECRET;
    let expireTime = parseInt(process.env.EXPIRES_IN, 10); //convert string to int
    let expires = { expiresIn: expireTime };
    let accessToken = jwt.sign(user, accessSecret, expires);

    responseBody = {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: expires
    }
    response = {
        statusCode: 200,
        body: responseBody
    };
    return response;
}

async function getItem(params) {
    try {
        await docClient.get(params).promise()
    } catch (err) {
        return err
    }
}