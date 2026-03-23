
import vertexai
from vertexai.generative_models import GenerativeModel
from agent import config

def diagnose():
    try:
        vertexai.init(project=config.PROJECT_ID, location=config.LOCATION)
        # Attempt to initialize a standard model to check if the SDK itself is happy
        model = GenerativeModel("gemini-3-flash-preview")
        print("✅ SDK Initialized with gemini-3-flash-preview")
        
        # Test a simple generation
        response = model.generate_content("hello")
        print(f"✅ Simple generation worked: {response.text}")
        
    except Exception as e:
        print(f"❌ Diagnostic failed: {e}")

if __name__ == "__main__":
    diagnose()
