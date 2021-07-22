const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async function (event, context) {
    //Init variables
    let responseBody = {};
    let body;
    //Get refresh_token in body
    try {
        body = JSON.parse(event.body);
        if (!body.refresh_token) {
         throw new TypeError('refresh_token key not found');  //no refresh token found in body       
        } 
    } catch (err) {
        responseBody = {
            "message": err.message
        };
        return response(403, responseBody)
    }
    
    //Delete Item
    try {
        await deleteItem(body.refresh_token);
    } catch (err) {
        responseBody = {
           message: "refresh token doesn't exist"
        };
        return response(403, responseBody); //cath error during DynamoDB action        
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

async function deleteItem(refresh) {
    const params = {
        TableName: 'token',
        Key: {
            refreshToken: `${refresh}`
        },
        ReturnValues: 'ALL_OLD',
        ConditionExpression: 'attribute_exists(refreshToken)'
    };
    await docClient.delete(params, (err) => {
        if(err){
            console.error(err)
        }
    }).promise()
}