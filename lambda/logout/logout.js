const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async function (event, context) {
    let response = {
        statusCode: 200,
        body: JSON.stringify(event)
    };
    return response;
}