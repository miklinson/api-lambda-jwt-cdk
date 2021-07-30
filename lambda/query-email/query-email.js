const mysql = require('mysql');

exports.handler = async function (event, context) {
    responseBody = {
        message: JSON.stringify(event.body)
    }
    return response(200, responseBody);
}

function response(statusCode, responseBody){
    return {
        statusCode: statusCode,
        body: JSON.stringify(responseBody)
    }
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
    number = remove_61(number)
    //add spaces to mobiles and specialties
    if (number.length == 10 && (number.substr(0,2) == "18" || number.substr(0,2) == "04" || number.substr(0,2) == "13")){
        // 1300/1800/04
        number = number.substr(0,4) + " " + number.substr(4,3) + " " + number.substr(7) 
    }
    else number = "(" + number.substr(0,2) + ") " + number.substr + " " + number.substr(6)
    return number
}