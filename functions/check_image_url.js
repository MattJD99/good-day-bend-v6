const https = require('https');

const url = "https://storage.googleapis.com/good-day-bend-v6.firebasestorage.app/blog-images/daily-1766138440420.jpg";

https.get(url, (res) => {
    console.log(`URL: ${url}`);
    console.log(`Status Code: ${res.statusCode}`);
    if (res.statusCode !== 200) {
        console.log("Image is NOT accessible publically.");
    } else {
        console.log("Image IS accessible.");
    }
}).on('error', (e) => {
    console.error(e);
});
