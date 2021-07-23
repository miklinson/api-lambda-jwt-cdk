const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async function (event, context) {
    //Init variables
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
    
    //Delete Item
    try {
        await deleteItem(body.refresh_token);
    } catch (err) { //cath error during DynamoDB deleteItem
        return response(403, message="refresh token doesn't exist");         
    }
    
    //If no error
    return response(200, message="token deleted");
}

function response(statusCode, message){
    let responseBody = {
            "message": `${message}`
    };
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