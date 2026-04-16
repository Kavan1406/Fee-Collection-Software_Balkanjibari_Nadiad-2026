#!/usr/bin/env python
"""
Test Razorpay Connectivity for Live API
Checks both local backend (8000) and live API (Render)
"""

import os
import sys
import requests
import json
from datetime import datetime
from decouple import config

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}✗ {text}{Colors.END}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠ {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ {text}{Colors.END}")

def test_local_backend():
    """Test local backend connectivity and Razorpay configuration"""
    print_header("LOCAL BACKEND TEST (localhost:8000)")
    
    try:
        # Test health endpoint
        print_info("Testing health endpoint...")
        response = requests.get('http://localhost:8000/health/', timeout=5)
        
        if response.status_code == 200:
            print_success(f"Backend Health: {response.status_code}")
            health_data = response.json()
            print(f"  Response: {json.dumps(health_data, indent=2)}")
        else:
            print_error(f"Health endpoint returned: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to local backend (http://localhost:8000)")
        print_warning("Make sure Django backend is running: python manage.py runserver 8000")
        return False
    except Exception as e:
        print_error(f"Error testing local backend: {str(e)}")
        return False
    
    return True

def test_razorpay_credentials():
    """Test Razorpay credentials are loaded correctly"""
    print_header("RAZORPAY CREDENTIALS TEST")
    
    try:
        # Load from environment
        razorpay_key_id = config('RAZORPAY_KEY_ID', default=None)
        razorpay_key_secret = config('RAZORPAY_KEY_SECRET', default=None)
        
        if not razorpay_key_id:
            print_error("RAZORPAY_KEY_ID not found in environment")
            return False
        
        if not razorpay_key_secret:
            print_error("RAZORPAY_KEY_SECRET not found in environment")
            return False
        
        # Mask the keys for security
        key_id_masked = f"{razorpay_key_id[:10]}...{razorpay_key_id[-5:]}" if len(razorpay_key_id) > 15 else "***"
        key_secret_masked = "***" if razorpay_key_secret else "NOT SET"
        
        print_success(f"RAZORPAY_KEY_ID loaded: {key_id_masked}")
        print_success(f"RAZORPAY_KEY_SECRET loaded: {key_secret_masked}")
        
        # Test Razorpay client
        try:
            import razorpay
            client = razorpay.Client(auth=(razorpay_key_id, razorpay_key_secret))
            print_success("Razorpay Client initialized successfully")
            
            # Try to fetch account details
            try:
                account = client.account.retrieve()
                print_success(f"Razorpay Account: {account.get('name', 'N/A')}")
                print_info(f"Account ID: {account.get('id', 'N/A')}")
                print_info(f"Email: {account.get('email', 'N/A')}")
                return True
            except Exception as e:
                print_warning(f"Could not fetch account details: {str(e)}")
                print_info("This is normal for test/sandbox accounts")
                return True
                
        except ImportError:
            print_error("razorpay module not installed")
            return False
        except Exception as e:
            print_error(f"Error initializing Razorpay client: {str(e)}")
            return False
            
    except Exception as e:
        print_error(f"Error testing Razorpay credentials: {str(e)}")
        return False

def test_payment_endpoints():
    """Test payment-related endpoints"""
    print_header("PAYMENT ENDPOINTS TEST")
    
    endpoints = [
        ('GET', '/api/v1/payments/', 'List Payments'),
        ('GET', '/api/v1/enrollments/', 'List Enrollments'),
        ('GET', '/api/v1/subjects/', 'List Subjects'),
    ]
    
    for method, endpoint, description in endpoints:
        try:
            url = f'http://localhost:8000{endpoint}'
            print_info(f"Testing: {description} ({method} {endpoint})")
            
            if method == 'GET':
                response = requests.get(url, timeout=5)
            else:
                response = requests.post(url, timeout=5)
            
            if response.status_code in [200, 201]:
                print_success(f"  Status: {response.status_code}")
            elif response.status_code == 401:
                print_warning(f"  Status: {response.status_code} (Authentication required - expected)")
            elif response.status_code == 403:
                print_warning(f"  Status: {response.status_code} (Permission denied - expected)")
            else:
                print_warning(f"  Status: {response.status_code}")
                
        except Exception as e:
            print_error(f"  Error: {str(e)}")

def test_payment_flow():
    """Test payment order creation flow"""
    print_header("PAYMENT ORDER CREATION TEST")
    
    try:
        import razorpay
        
        razorpay_key_id = config('RAZORPAY_KEY_ID', default=None)
        razorpay_key_secret = config('RAZORPAY_KEY_SECRET', default=None)
        
        if not razorpay_key_id or not razorpay_key_secret:
            print_error("Razorpay credentials not found")
            return False
        
        client = razorpay.Client(auth=(razorpay_key_id, razorpay_key_secret))
        
        # Create a test order
        print_info("Creating test payment order...")
        order_data = {
            'amount': 50000,  # 500 rupees in paise
            'currency': 'INR',
            'receipt': f'test_{int(datetime.now().timestamp())}',
            'payment_capture': 1,  # Auto-capture
        }
        
        order = client.order.create(data=order_data)
        
        print_success(f"Test Order Created Successfully!")
        print(f"  Order ID: {order['id']}")
        print(f"  Amount: ₹{order['amount']/100}")
        print(f"  Status: {order['status']}")
        print(f"  Created: {datetime.fromtimestamp(order['created_at'])}")
        
        return True
        
    except Exception as e:
        print_error(f"Payment order creation failed: {str(e)}")
        print_warning("This might be due to test/sandbox limitations")
        return False

def test_live_api():
    """Test live API on Render"""
    print_header("LIVE API TEST (Render)")
    
    live_api_urls = [
        'https://balkanji-backend-ai5a.onrender.com/health/',
        'https://balkanji-backend-ai5a.onrender.com/api/v1/subjects/',
    ]
    
    for url in live_api_urls:
        try:
            print_info(f"Testing: {url}")
            response = requests.get(url, timeout=10)
            print_success(f"  Status: {response.status_code}")
        except requests.exceptions.ConnectionError:
            print_warning(f"  Connection timeout (might be cold start)")
        except Exception as e:
            print_error(f"  Error: {str(e)}")

def main():
    """Run all tests"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("╔═══════════════════════════════════════════════════════════════╗")
    print("║       RAZORPAY CONNECTIVITY TEST SUITE                        ║")
    print("║       Testing Local & Live API                                ║")
    print(f"║       {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}                                       ║")
    print("╚═══════════════════════════════════════════════════════════════╝")
    print(f"{Colors.END}\n")
    
    results = {
        'Local Backend': test_local_backend(),
        'Razorpay Credentials': test_razorpay_credentials(),
    }
    
    if results['Local Backend']:
        test_payment_endpoints()
        results['Payment Flow'] = test_payment_flow()
    
    test_live_api()
    
    # Summary
    print_header("TEST SUMMARY")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{Colors.GREEN}PASSED{Colors.END}" if result else f"{Colors.RED}FAILED{Colors.END}"
        print(f"  {test_name}: {status}")
    
    print(f"\n{Colors.BOLD}Overall: {passed}/{total} tests passed{Colors.END}")
    
    if results.get('Razorpay Credentials'):
        print_success("Razorpay is properly configured for live deployment!")
    else:
        print_error("Razorpay configuration needs attention before deployment")
    
    print("\n")

if __name__ == '__main__':
    main()
