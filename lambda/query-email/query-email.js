const mysql = require('mysql');

var mySqlPool  = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database : process.env.DB_NAME,
});

exports.handler = async function (event, context) {
    let number,data;
    let postBody = JSON.parse(event.body)
    let responseBody =[]
    let item, responseError = {}
    let obscured = []
    
    context.callbackWaitsForEmptyEventLoop = false; //prevent lambda timeout
    
    try {
        // get memberdata details
        data = await getDbCreds(postBody.email)
        console.log(data)
        if (data.length == 0) throw new Error('The email address provided was not found to match a service')
        // check if number is specialty or dids
        obscured = await conceal(data)
    } catch (err) {
        console.log(err);
        responseError = {
            message: err.message
        }
        return response(403, responseError);
    }
    
    for(const key in data){
        item = {member_id: data[key].id, number: obscured[key].number, status_id: data[key].status_id}
        responseBody.push(item)
    }

    return response(200, responseBody);
}

function response(statusCode, responseBody){
    return {
        statusCode: statusCode,
        body: JSON.stringify(responseBody)
    }
}

async function conceal(data){
    let number
    let details = []
    for(let i=0; i< data.length; i++){ details[i] = [] }
    for(let i=0; i< data.length; i++){
        if (data[i].specialty_number) number = await transform(data[i].specialty_number, 'specialty')
        else if (data[i].dids) number = await transform(data[i].dids, 'dids')
        details[i]['number'] = number
    }
    return details
}

async function transform(number, type){
    if (type == 'specialty') {
        number = await add_brackets(number)
        number = number.substr(0,4) + ' xxx x' + number.substr(-2)    
    } else if (type == 'dids') {
        number = await add_brackets(number)
        number = number.substr(0,4) + ' xxx x' + number.substr(-3)    
    }
    return number
    
}

async function getDbCreds(email, member_id){
    return new Promise(function(resolve, reject) {
        mySqlPool.getConnection(function(error, connection) {
            if(error) reject(error)
            connection.query(`SELECT * FROM memberdata WHERE email_address='${email}' ORDER BY status_id ASC`, function (err, results, fields) {
                // And done with the connection.
                connection.release();
                // Handle error after the release.
                if (err) reject(err)
                else { 
                    resolve(results)
                }
            });
        });
    })
}

async function remove_61(number){
    //regular landline
    if (number.length == 11) number = (number.substr(0,2) == 61) ? 0 + number.substr(2) : number
    //1300 / 1800
    else if (number.length == 12) number = (number.substr(0,2) == 61) ? number.substr(2) : number
    //13
    else if (number.length == 8) number = (number.substr(0,2) == 61) ? number.substr(2) : number
    return number
}

async function add_brackets(number){
    //remove 61 if it's present
    number = await remove_61(number)
    //add spaces to mobiles and specialties
    if (number.length == 10 && (number.substr(0,2) == "18" || number.substr(0,2) == "04" || number.substr(0,2) == "13")){
        // 1300/1800/04
        number = number.substr(0,4) + " " + number.substr(4,3) + " " + number.substr(7) 
    }
    else number = "(" + number.substr(0,2) + ") " + number.substr + " " + number.substr(6)
    return number
}