const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async function (event, context) {
    //Init variables
    let responseBody = {};
    let refreshToken, item;
    //Get refresh_token in body
    try {
        const body = JSON.parse(event.body);
        refreshToken = body.refresh_token; //no refresh token found in body
        if(!refreshToken) {
         responseBody = {
            message: "JWT must be provided"
         };
         return response(403, responseBody);   
        }
    } catch (err) {
        responseBody = {
            "message": err.message
        };
        return response(403, responseBody)
    }

    //Init parameters
    const params = {
        TableName: 'token',
        Key: {
            refreshToken: refreshToken
        },
        ReturnValues: 'ALL_OLD',
        ConditionExpression: 'attribute_exists(refreshToken)'
    };
    //Delete Item
    try {
        console.log(params);
        await deleteItem(params);
    } catch (err) {
        responseBody = {
            message: "refresh token doesn't exist"
        };
        response(403, responseBody); //cath error during DynamoDB action
    }
    
    //If no error
    responseBody = {
        message: "token deleted"
    };
    return response(200, responseBody);
}

function response(statusCode, responseBody){
    return {
        statusCode: statusCode,
        body: JSON.stringify(responseBody)
    }
}

async function deleteItem(params) {
    return await docClient.delete(params, (err) => {
        if(err){
                return err;
            }
    })
    .promise();
}