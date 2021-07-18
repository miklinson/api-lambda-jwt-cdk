const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

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
    //Save refresh token in DynamoDB
    const params = {
        TableName: 'token',
        Item: {
            user: username,
            refreshToken: refreshToken
        }
    }
    let ddbError = false;
    let response = {};
    try {
        await createItem(params)
    } catch (err) {
        ddbError = true;
        console.log(err);
        response = {
            statusCode: 500,
            body: JSON.stringify(err)
        };
    }
    if(ddbError) return response;

    //If no error, response body
    let responseBody = {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: "Bearer",
        expires_in: expireTime
    };
    response = {
        statusCode: 200,
        body: JSON.stringify(responseBody)
    };
    return response;
}

async function createItem(params) {
    try {
        await docClient.put(params).promise();
    } catch (err) {
        return err;
    }
}