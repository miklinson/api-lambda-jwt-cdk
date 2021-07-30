const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async function (event, context) {
    //Init variables
    let data, decoded, token;
    let responseBody = {};
    let body;

    try {
        // Get event body and parse
        body = JSON.parse(event.body);
        if (!body.refresh_token) throw new TypeError("refresh_token key not found")
        // getItem in DynamoDB
        data = await getItem(body.refresh_token);
        if (!data.hasOwnProperty('Item')) throw new TypeError("refresh token doen't exist")
        // verify JWT
        decoded = jwt.verify(body.refresh_token, process.env.REFRESH_TOKEN_SECRET);
        //If JWT verification succeeded
        token = await createToken(decoded.email); // returns { access, expireTime }
    } catch (err) {
        return response(403, err.message)
    }
    // Finally if no error was catched
    responseBody = {
        access_token: token.access,
        token_type: "Bearer",
        expires_in: token.expireTime
    }
    return response(200, null, responseBody);
}

async function createToken(email){
    let email = { email: email };
    let accessSecret = process.env.ACCESS_TOKEN_SECRET;
    let expireTime = parseInt(process.env.EXPIRES_IN, 10); //convert string to int
    let expires = { expiresIn: expireTime };
    let access = jwt.sign(email, accessSecret, expires);
    
    return { access, expireTime }
}

function response(statusCode, message = null, respBody = null){
    if(message != null){
        respBody = {
            message: `${message}`
        }    
    }
    
    return {
        statusCode: statusCode,
        body: JSON.stringify(respBody)
    }
}

async function getItem(refreshToken) {
    const params = {
        TableName: 'token',
        Key: {
            refreshToken: refreshToken
        }
    }
    return await docClient.get(params, (err) => {
        if(err){
            console.error(err)
        }
    }).promise()
}