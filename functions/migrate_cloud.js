const { onRequest } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');

// SOURCE KEY (Old Project: good-day-bend)
// Provided by user in previous turn.
const sourceServiceAccount = {
    "type": "service_account",
    "project_id": "good-day-bend",
    "private_key_id": "2b8c96c79fb60dc672730895139784f454427bae",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQCrsRDdVgyPJV58\nuftBanNQJ72TEi9RhkUAStxxV1TF7jiJ9vv3m0ybilZhLrmz3m1L8sN58Js0XWMh\nXvVSPI1u7R0VLlSsOdR3gYTlzTEwf4IAIfsndjmC4GqaiaLqKwJAkj4YPKIbHFbD\nlOGbvp//rsMEa7Y99HbybpXnr9OAXZZK4L7xwhx0kLfiNvBJwbsaVvxYtS3sjJiY\noSNAGOG0jYn32S2i1E3fvzgI9FT4SeljVi+1hV6H6UaAMEmAfkjb0t13uOyFH9UD\nl/PKo/xAl+Suf8y49a1/EoWDV3RqjfcdLoKJ37QGf+Nby94T/PNfizlZuEd6z4OZ\nVbFtnQAvAgMBAAECggEAAVZCpFvsLcfZDC2X6EgqQmCHgw1W3af8V5E9quBG4mJa\n1wWGVsTt0XQ//J0UMx4Iny5ybpD8vxP5wU5vqJvyGgAHWZ01FEDrB6He5WSLUoOx\nASFCnGm47uz3x4uff3qll4J2sKegN4fT9nftUyd72s4t6es7eGYJRcADXid/WnYy\nI62j2i+4NiKFUPe27z4+b5OcKrBLFrWuavF1BbTOemOfwHMNO8NnceOs/X4QzjEU\nODJpdiOB3yvUgcJHLJREn4zJo6XmgUXggYm9arEFrMcFI07Oui75FhehYcCvY7+X\nd96jfSo8CNeS0ys1FFmUI4fs882N8Ot+/fs4T4zA4QKBgQDxIvbX4E+U/zrab4DD\nImnQEk/TsDPHU+ibKfB5KsqCLRaux110kcpH4aJa3T3Cl42WtR35szF75UZko6Ke\noeZuYN+oVCc7wbZkq1MQLT6zHAHiADPmcsHAReqDr15v92OP2jonr3RZliBslnlW\n4SHtvgIVK2IBtGR2KOOM0c7TPwKBgQC2RkoeABrg0nBkeg2tQizFf7pe2hqCr6ny\nFUuE4WOvBf3kWWGhP4nV2xrq9wOBseQUgcJU1Yfh9ePBIIyH06t7mIHpLH64CJzi\nLKu/HReEGgmYgS1IQ62FWj0sG4Fj4IfuzjAJWk6o/Vx0OYSRHnXICtiolMAUCuwu\n+fRA+5XHEQKBgQDCrUW4N4JIel5bZ9X+tFPVBlOoRgMnk9ihHJTmXeOsgRZk+NO8\nfs9ehQ18ak2oQo6u835Fz6PNsObJ7Uom4/KTfmZTEc2y8st8Ls0arEyIcb4bZaqB\nDHjb8BZLRlPp9UJOKxL0YzR99zQqNrmzqIKp29L2oFW5ppfMxWogkGp4JQKBgQCY\nZf6URMw0S16zc6U5xol+e8PMiJj/yXXTNWDV8kkRTnYwVVcepexNxQslh3AEIUMs\nri1YFsys7ZUGpXs6GY1YInQEDDLLFlBtfqH+gYlm5wo820yMDiHnzEI3PawaYOHm\nlbhuKXZ5LpT9jBW96/TYU9FAalaKq3M797r0FiXtsQKBgQCWPWXc69vJx2FJrgDv\nXrvQYPM1n0I+R4iWvI6j2ymlPe/QL7qmBe3WtTdBTZy2EvCb49vdJXouk1G7LItn\nuQc9TEZnPFqgl5JBoKXsyw/zvRNDdzXPRRqCsK/QEaf5V9uv34ushqBHQ66crkbQ\n7SpxAWuMvVVTIf8F8OWsnY4NvA==\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-fbsvc@good-day-bend.iam.gserviceaccount.com",
    "client_id": "113677573101564628784",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40good-day-bend.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
};

// Intialize Source App
const sourceApp = admin.initializeApp({
    credential: admin.credential.cert(sourceServiceAccount)
}, 'sourceAppCloud');

const sourceDb = sourceApp.firestore();

// Initialize Dest App (Default)
if (!admin.apps.length) {
    admin.initializeApp();
}
const destDb = admin.firestore();

exports.run = onRequest({ timeoutSeconds: 540 }, async (req, res) => {
    try {
        const collections = ['events', 'articles', 'daily_updates'];
        let log = [];

        for (const col of collections) {
            log.push(`Starting ${col}...`);
            const snap = await sourceDb.collection(col).get();
            if (snap.empty) {
                log.push(`No docs in ${col}`);
                continue;
            }

            const batch = destDb.batch();
            let count = 0;
            snap.forEach(doc => {
                batch.set(destDb.collection(col).doc(doc.id), doc.data(), { merge: true });
                count++;
            });
            await batch.commit();
            log.push(`Migrated ${count} docs in ${col}`);
        }

        res.json({ success: true, log });
    } catch (e) {
        res.status(500).json({ error: e.message, stack: e.stack });
    }
});
