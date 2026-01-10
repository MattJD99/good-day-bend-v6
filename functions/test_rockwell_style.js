
const { generateImage } = require('./lib/imageGen');

async function test() {
    console.log("🧪 Testing Rockwell Style Logic...");
    try {
        // We just dry run the prompt logic by checking logs, 
        // but since we can't easily mock the internal state without more work,
        // we will just run it and see the output.
        // NOTE: This assumes the user is okay with generating an actual image.

        const url = await generateImage("A happy dog running in a field");
        console.log("Result URL:", url);
    } catch (e) {
        console.error("Test failed:", e);
    }
}

test();
