const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async function (event, context) {
    //Init variables
    let ddbError = false;
    let response, responseBody = {};
    let refreshToken;
    //Get refresh_token in body
    try {
        const body = JSON.parse(event.body);
        refreshToken = body.refresh_token; //no refresh token found in body
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

    //Init parameters
    let params = {
        TableName: 'token',
        Key: {
            refreshToken: refreshToken
        }
    };
    //Delete Item
    try {
        await deleteItem(params);
    } catch (err) {
        ddbError = true;
        response = {
            statusCode: 500,
            body: JSON.stringify(err.message)
        };
    }
    if (ddbError) return response; //cath error during DynamoDB action
    //If no error
    responseBody = {
        "message": "token deleted!"
    }
    response = {
        statusCode: 204,
        body: JSON.stringify(responseBody)
    };
    return response;
}

async function deleteItem(params) {
    try{
        docClient.delete(params).promise()
    } catch (err) {
        return err;
    }
    
}