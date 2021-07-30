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
    let data;
    
    // MySQL
    context.callbackWaitsForEmptyEventLoop = false; //prevent lambda timeout
    mySqlPool.getConnection(function(err, connection) {
        if(err)throw err;
        connection.query('SELECT * FROM memberdata limit 1', function (err, results, fields) {
        // And done with the connection.
        connection.release();
        // Handle error after the release.
        if (err) throw err;
        else data = results[0];
        });
    }); 
    
    //Decode credentials
    let credentials = await decode(event.headers['Authorization']); //returns { username, password }
    
    //Check UN and PW
    let hashedpw = '$2y$10$ha5pQfotz6zwpDLuZ1GgyOxfPSUmxE6NF1MN3JVuqHEWm5bXy0nAu';
    let compare = bcryptjs.compareSync(credentials.password, hashedpw)
    if(!compare) {
    //if(credentials.username != 'admin' || credentials.password != 'hashedpw') {
        responseBody = {
            message: "Invalid Credentials!"
        }
        return response(200, responseBody);
    }
    
    //Prepare JWT details
    let user = { user: credentials.username };
    let token = await createToken(user); //returns { access, refresh, expireTime }

    //Save refresh token in DynamoDB
    try {
        await createItem(token.refresh, credentials.username)
    } catch (err) {
        console.log(err);
        responseBody = {
            message: err.message
        }
        return response(403, responseBody);
    }

    //If no error, response body
    responseBody = {
        compare: compare,
        data: data,
        access_token: token.access,
        refresh_token: token.refresh,
        token_type: "Bearer",
        expires_in: token.expireTime
    };
    return response(200, responseBody);
}

async function createToken(user) {
    let accessSecret = process.env.ACCESS_TOKEN_SECRET;
    let refreshSecret = process.env.REFRESH_TOKEN_SECRET;
    let expireTime = parseInt(process.env.EXPIRES_IN, 10); //convert string to int
    let expires = { expiresIn: expireTime }
    //Create an acess token
    let access = jwt.sign(user, accessSecret, expires);
    //Create a refresh token
    let refresh = jwt.sign(user, refreshSecret);
    
    return { access, refresh, expireTime }
}

function response(statusCode, responseBody){
    return {
        statusCode: statusCode,
        body: JSON.stringify(responseBody)
    }
}

async function decode(userCred){
    let replaced = userCred && userCred.replace('Basic ', '');
    //Decode the credentials
    let data = new Buffer.from(replaced, 'base64').toString('ascii');
    let username = data.split(':')[0];
    let password = data.split(':')[1];
    return { username, password }
}

async function createItem(refreshToken, username) {
    const params = {
        TableName: 'token',
        Item: {
            refreshToken: refreshToken,
            user: username,
            createTime: Date.now(),
        }
    }
    try {
        await docClient.put(params).promise();

    } catch (err) {
        return err;
    }
}

