import requests
import sys

def test_login():
    url = "http://127.0.0.1:8002/token"
    data = {
        "username": "admin",
        "password": "admin123"
    }
    
    try:
        print(f"Testing login at {url}...")
        response = requests.post(url, data=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            print("Login successful!")
        else:
            print("Login failed.")
            
    except requests.exceptions.ConnectionError:
        print("Connection failed. Is the backend running on port 8002?")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    test_login()
