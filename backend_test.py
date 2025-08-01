import requests
import sys
import os
from datetime import datetime

class PhoolAPITester:
    def __init__(self, base_url="https://5e8d30e0-3e86-4a2d-be44-603603196d3e.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, files=None, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, data=data, headers=headers, timeout=60)
                else:
                    headers['Content-Type'] = 'application/json'
                    response = requests.post(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"Response preview: {str(response_data)[:200]}...")
                    return True, response_data
                except:
                    print(f"Response text: {response.text[:200]}...")
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text[:500]}...")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_endpoint(self):
        """Test the health endpoint"""
        return self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )

    def test_flower_identification(self, image_path):
        """Test flower identification with image"""
        if not os.path.exists(image_path):
            print(f"❌ Test image not found: {image_path}")
            return False, {}
            
        try:
            with open(image_path, 'rb') as f:
                files = {'file': ('test_rose.jpg', f, 'image/jpeg')}
                success, response = self.run_test(
                    "Flower Identification",
                    "POST",
                    "api/identify-flower",
                    200,
                    files=files
                )
                
                if success and isinstance(response, dict):
                    # Validate response structure
                    required_fields = [
                        'id', 'flower_name', 'scientific_name', 'family',
                        'basic_facts', 'care_instructions', 'symbolic_meanings',
                        'cultivation_tips', 'seasonal_info', 'interesting_story',
                        'confidence', 'timestamp'
                    ]
                    
                    missing_fields = [field for field in required_fields if field not in response]
                    if missing_fields:
                        print(f"⚠️  Missing fields in response: {missing_fields}")
                    else:
                        print("✅ All required fields present in response")
                        print(f"Identified flower: {response.get('flower_name', 'Unknown')}")
                        print(f"Scientific name: {response.get('scientific_name', 'Unknown')}")
                        print(f"Confidence: {response.get('confidence', 'Unknown')}")
                
                return success, response
        except Exception as e:
            print(f"❌ Error testing flower identification: {str(e)}")
            return False, {}

    def test_invalid_file_upload(self):
        """Test uploading invalid file type"""
        try:
            # Create a text file to test invalid file type
            with open('/tmp/test.txt', 'w') as f:
                f.write("This is not an image")
            
            with open('/tmp/test.txt', 'rb') as f:
                files = {'file': ('test.txt', f, 'text/plain')}
                success, response = self.run_test(
                    "Invalid File Type",
                    "POST",
                    "api/identify-flower",
                    400,  # Expecting 400 Bad Request
                    files=files
                )
                return success, response
        except Exception as e:
            print(f"❌ Error testing invalid file upload: {str(e)}")
            return False, {}

def main():
    print("🌸 Starting Phool API Testing...")
    print("=" * 50)
    
    # Setup
    tester = PhoolAPITester()
    
    # Test 1: Health endpoint
    print("\n📋 TEST 1: Health Endpoint")
    health_success, health_response = tester.test_health_endpoint()
    
    if not health_success:
        print("❌ Health check failed, backend may not be running properly")
        print("📊 Final Results:")
        print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
        return 1
    
    # Test 2: Flower identification with valid image
    print("\n📋 TEST 2: Flower Identification")
    image_path = "/app/test_rose.jpg"
    identification_success, identification_response = tester.test_flower_identification(image_path)
    
    # Test 3: Invalid file type
    print("\n📋 TEST 3: Invalid File Type Handling")
    invalid_success, invalid_response = tester.test_invalid_file_upload()
    
    # Print final results
    print("\n" + "=" * 50)
    print("📊 FINAL TEST RESULTS:")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! Backend is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the details above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())