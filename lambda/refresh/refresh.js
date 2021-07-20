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
        response = {
            statusCode: 403,
            body: JSON.stringify(responseBody)
        };
    }
    if (parseError) return response;

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
            response = {
                statusCode: 403,
                body: JSON.stringify(responseBody)
            };
        }
    } catch (err) {
        ddbError = true;
        response = {
            statusCode: 500,
            body: JSON.stringify(err.message)
        };
    }
    if (noToken) return response; //no refreshToken found in DynamoDB
    if (ddbError) return response; //cath error during DynamoDB action
    //If no error, get the sign details and then create new access token
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            verifyError = true;
            responseBody = {
                "message": err.message
            }
            response = {
                statusCode: 403,
                body: JSON.stringify(responseBody)
            };
        } else {
            jwtDecoded = decoded.user;
        }
    });
    if (verifyError) return response;

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
    response = {
        statusCode: 200,
        body: JSON.stringify(responseBody)
    };
    return response;
}

async function getItem(params) {
    try {
        return await docClient.get(params).promise()
    } catch (err) {
        return err
    }
}