const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const mysql = require('mysql'); 
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();


var mySqlPool  = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database : process.env.DB_NAME,
});

exports.handler = async function (event, context) {
    //Init variables
    let responseBody = {};
    let postBody = JSON.parse(event.body)
    let data, token;
    
    context.callbackWaitsForEmptyEventLoop = false; //prevent lambda timeout
    
    try {
        data = await getDbCreds(postBody.email, postBody.member_id)
        //Check PW if matched
        let match = bcryptjs.compareSync(postBody.password, data.password)
        if(!match) throw new Error('invalid credentials')
        //Status ID must be 3
        if(data.status_id != 3) throw new Error('please check account status')
        //Prepare JWT details
        let claims = { email: postBody.email, id: postBody.member_id };
        token = await createToken(claims); //returns { access, refresh, expireTime }
        //Save refresh token in DynamoDB
        await createItem(token.refresh, postBody.email, postBody.member_id)
    } catch (err) {
        console.log(err);
        responseBody = {
            message: err.message
        }
        return response(403, responseBody);
    }

    //If no error, response body
    responseBody = {
        access_token: token.access,
        refresh_token: token.refresh,
        token_type: "Bearer",
        expires_in: token.expireTime
    };
    return response(200, responseBody);
}

async function getDbCreds(email, member_id){
    return new Promise(function(resolve, reject) {
        mySqlPool.getConnection(function(error, connection) {
            if(error) reject(error)
            connection.query(`SELECT first_name, status_id, password FROM memberdata where email_address='${email}' AND id=${member_id}`, function (err, results, fields) {
                // And done with the connection.
                connection.release();
                // Handle error after the release.
                if (err) reject(err)
                else { 
                    resolve(results[0])
                }
            });
        });
    })
}

async function createToken(claims) {
    let accessSecret = process.env.ACCESS_TOKEN_SECRET;
    let refreshSecret = process.env.REFRESH_TOKEN_SECRET;
    let expireTime = parseInt(process.env.EXPIRES_IN, 10); //convert string to int
    let expires = { expiresIn: expireTime }
    //Create an acess token
    let access = jwt.sign(claims, accessSecret, expires);
    //Create a refresh token
    let refresh = jwt.sign(claims, refreshSecret);
    
    return { access, refresh, expireTime }
}

function response(statusCode, responseBody){
    return {
        statusCode: statusCode,
        body: JSON.stringify(responseBody)
    }
}

async function createItem(refreshToken, email, id) {
    const params = {
        TableName: 'token',
        Item: {
            refreshToken: refreshToken,
            email: email,
            id: id,
            createTime: Date.now(),
        }
    }
    try {
        await docClient.put(params).promise();

    } catch (err) {
        return err;
    }
}