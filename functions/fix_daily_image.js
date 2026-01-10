const { db } = require('./lib/firebase');

async function fixDailyImage() {
    try {
        const docId = 'daily-2025-12-22';
        const docRef = db.collection('daily_updates').doc(docId);

        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            console.log(`Document ${docId} does not exist.`);
            return;
        }

        const data = docSnap.data();
        console.log(`Original Image: ${data.image}`);

        const newImage = "https://mikeputnamphoto.com/wp-content/uploads/2014/01/bachelor.jpg";

        await docRef.update({
            image: newImage,
            imageUrl: newImage // Updating both just in case
        });

        console.log(`Updated ${docId} with new image: ${newImage}`);

    } catch (error) {
        console.error("Error updating daily image:", error);
    }
}

fixDailyImage();
