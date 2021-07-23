const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async function (event, context) {
    //Init variables
    let verifyError, noToken = false;
    let jwtDecodedUsername, data, jwtError;
    let responseBody = {};
    let body, message;
    //Get refresh_token in body
    try {
        body = JSON.parse(event.body);
        if (!body.refresh_token) { //no refresh token found in body
         throw new TypeError('refresh_token key not found');         
        } 
    } catch (err) {
        return response(403, message="err.message")
    }
    
    // getItem in DynamoDB
    try {
        data = await getItem(body.refresh_token);
        if (!data.hasOwnProperty('Item')) {
            noToken = true;
        }
    } catch (err) {
        return response(403, err.message);
    }
    if (noToken) return response(403, message="refresh token doen't exist"); //no refreshToken found in DynamoDB
    
    //If no error, get the sign details and then create new access token
    jwt.verify(body.refresh_token, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            verifyError = true;
            jwtError = err.message;
        } else {
            jwtDecodedUsername = decoded.user;
        }
    });
    if (verifyError) return response(403, jwtError);

    //If JWT verification succeeded
    let user = { user: jwtDecodedUsername };
    let token = await createToken(user); // returns { access, expireTime }
    
    responseBody = {
        access_token: token.access,
        token_type: "Bearer",
        expires_in: token.expireTime
    }
    return response(200, null, responseBody);
}

async function createToken(user){
    let accessSecret = process.env.ACCESS_TOKEN_SECRET;
    let expireTime = parseInt(process.env.EXPIRES_IN, 10); //convert string to int
    let expires = { expiresIn: expireTime };
    let access = jwt.sign(user, accessSecret, expires);
    
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