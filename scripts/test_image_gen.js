
const { generateImage } = require('../functions/lib/imageGen');

async function test() {
    console.log("Testing Image Generation...");
    try {
        const url = await generateImage("A beautiful sunset over Bend Oregon");
        console.log("Result URL:", url);
    } catch (e) {
        console.error("Test function failed:", e);
    }
}

test();
