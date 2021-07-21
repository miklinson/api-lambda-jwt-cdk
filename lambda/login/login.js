const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async function (event, context) {
    //Init variables
    let ddbError = false;
    let responseBody = {};
    //Get Credentials
    let userCred = event.headers['Authorization'];
    //Check if authorization header exist and then replace
    let replaced = userCred && userCred.replace('Basic ', '');
    //Decode the credentials
    let data = new Buffer.from(replaced, 'base64').toString('ascii');
    let username = data.split(':')[0];
    let password = data.split(':')[1];
    //Check UN and PW
    if(username != 'admin' || password != 'hashedpw') {
        responseBody = {
            message: "Invalid Credentials!"
        }
        return response(200, responseBody);
    }
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
            refreshToken: refreshToken,
            user: username,
            createTime: Date.now(),
        }
    }
    
    try {
        await createItem(params)
    } catch (err) {
        ddbError = true;
        console.log(err);
        responseBody = {
            message: err.message
        }
    }
    if(ddbError) return response(403, responseBody);

    //If no error, response body
    responseBody = {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: "Bearer",
        expires_in: expireTime
    };
    return response(200, responseBody);
}

function response(statusCode, responseBody){
    return {
        statusCode: statusCode,
        body: JSON.stringify(responseBody)
    }
}

async function createItem(params) {
    try {
        await docClient.put(params).promise();
    } catch (err) {
        return err;
    }
}