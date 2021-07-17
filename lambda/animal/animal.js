exports.handler = async function (event, context) {
    
    let animals = ["Lion", "Tiger", "Orca", "Black Mamba", "Puma", "Lobster", "Eagle", "Falcon", "Pigeon"];
    const random = Math.floor(Math.random() * animals.length);
    let responseBody = {
        animal: animals[random]
    };
    let response = {
        statusCode: 200,
        headers: {
            "x-custom-header": "custom-header-value"
        },
        body: JSON.stringify(responseBody)
    };
    return response;
}