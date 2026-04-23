"""
Automated API Testing Script
Tests all backend endpoints and functionality
"""
import requests
import json
from datetime import datetime

BASE_URL = 'http://localhost:8000'
API_URL = f'{BASE_URL}/api/v1'

# Test results tracking
tests_passed = 0
tests_failed = 0
test_results = []

def log_test(test_name, passed, message=""):
    global tests_passed, tests_failed
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"{status} - {test_name}"
    if message:
        result += f": {message}"
    test_results.append(result)
    print(result)
    with open('test_output.log', 'a', encoding='utf-8') as f:
        f.write(result + '\n')
    if passed:
        tests_passed += 1
    else:
        tests_failed += 1

def test_health_check():
    """Test 1: Health Check Endpoint"""
    try:
        response = requests.get(f'{BASE_URL}/health/')
        passed = response.status_code == 200 and response.json()['status'] == 'healthy'
        log_test("Health Check", passed, f"Status: {response.status_code}")
        return passed
    except Exception as e:
        log_test("Health Check", False, str(e))
        return False

def test_invalid_login():
    """Test 2: Invalid Login"""
    try:
        response = requests.post(
            f'{API_URL}/auth/login/',
            json={'username': 'wronguser', 'password': 'wrongpass'}
        )
        passed = response.status_code == 400
        log_test("Invalid Login Returns 400", passed, f"Status: {response.status_code}")
        return passed
    except Exception as e:
        log_test("Invalid Login Returns 400", False, str(e))
        return False

def test_admin_login():
    """Test 3: Admin Login"""
    try:
        response = requests.post(
            f'{API_URL}/auth/login/',
            json={'username': 'admin', 'password': 'admin123'}
        )
        if response.status_code == 200:
            data = response.json()
            has_tokens = 'access' in data.get('data', {}) and 'refresh' in data.get('data', {})
            has_user = 'user' in data.get('data', {})
            is_admin = data.get('data', {}).get('user', {}).get('role') == 'ADMIN'
            passed = has_tokens and has_user and is_admin
            log_test("Admin Login", passed, f"Tokens: {has_tokens}, User: {has_user}, Role: ADMIN")
            return response.json()['data'] if passed else None
        else:
            log_test("Admin Login", False, f"Status: {response.status_code}")
            return None
    except Exception as e:
        log_test("Admin Login", False, str(e))
        return None

def test_staff_login():
    """Test 4: Staff Login"""
    try:
        response = requests.post(
            f'{API_URL}/auth/login/',
            json={'username': 'staff', 'password': 'staff123'}
        )
        if response.status_code == 200:
            data = response.json()
            is_staff = data.get('data', {}).get('user', {}).get('role') == 'STAFF'
            passed = is_staff
            log_test("Staff Login", passed, f"Role: {data.get('data', {}).get('user', {}).get('role')}")
            return response.json()['data'] if passed else None
        else:
            log_test("Staff Login", False, f"Status: {response.status_code}")
            return None
    except Exception as e:
        log_test("Staff Login", False, str(e))
        return None

def test_student_login():
    """Test 5: Student Login"""
    try:
        response = requests.post(
            f'{API_URL}/auth/login/',
            json={'username': 'student1', 'password': 'student123'}
        )
        if response.status_code == 200:
            data = response.json()
            is_student = data.get('data', {}).get('user', {}).get('role') == 'STUDENT'
            passed = is_student
            log_test("Student Login", passed, f"Role: {data.get('data', {}).get('user', {}).get('role')}")
            return response.json()['data'] if passed else None
        else:
            log_test("Student Login", False, f"Status: {response.status_code}")
            return None
    except Exception as e:
        log_test("Student Login", False, str(e))
        return None

def test_get_students(token):
    """Test 6: Get Students List"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f'{API_URL}/students/', headers=headers)
        if response.status_code == 200:
            data = response.json()
            has_results = 'results' in data
            count = len(data.get('results', []))
            passed = has_results and count > 0
            log_test("Get Students List", passed, f"Found {count} students")
            return passed
        else:
            log_test("Get Students List", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        log_test("Get Students List", False, str(e))
        return False

def test_create_student(token):
    """Test 7: Create New Student"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        student_data = {
            'name': 'Automated Test Student',
            'age': 10,
            'gender': 'MALE',
            'date_of_birth': '2014-01-01',
            'parent_name': 'Test Parent',
            'phone': '99999-99999',
            'address': 'Test Address',
            'area': 'Test Area'
        }
        response = requests.post(f'{API_URL}/students/', json=student_data, headers=headers)
        if response.status_code == 201:
            data = response.json().get('data', {})
            student_id = data.get('id', 'N/A')
            log_test("Create Student", True, f"Created student {student_id}")
            return data
        elif response.status_code == 400 and 'already exists' in response.text.lower():
            # Try to find existing student
            log_test("Create Student", True, "Student already exists - fetching ID")
            search_response = requests.get(f'{API_URL}/students/?search=Automated Test Student', headers=headers)
            if search_response.status_code == 200 and len(search_response.json().get('results', [])) > 0:
                return search_response.json()['results'][0]
        
        log_test("Create Student", False, f"Status: {response.status_code}, Error: {response.text[:100]}")
        return None
    except Exception as e:
        log_test("Create Student", False, str(e))
        return None

def test_update_student(token, student_id):
    """Test 8: Update Student"""
    try:
        if not student_id:
             log_test("Update Student", False, "Skipped - No Student ID")
             return False
        
        headers = {'Authorization': f'Bearer {token}'}
        update_data = {'name': 'Updated Test Student'}
        response = requests.patch(f'{API_URL}/students/{student_id}/', json=update_data, headers=headers)
        passed = response.status_code == 200
        log_test("Update Student", passed, f"Status: {response.status_code}")
        # Revert name for idempotency
        requests.patch(f'{API_URL}/students/{student_id}/', json={'name': 'Automated Test Student'}, headers=headers)
        return passed
    except Exception as e:
        log_test("Update Student", False, str(e))
        return False

def test_search_students(token):
    """Test 9: Search Students"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f'{API_URL}/students/?search=Aarav', headers=headers)
        if response.status_code == 200:
            data = response.json()
            results = data.get('results', [])
            passed = len(results) > 0 and 'Aarav' in results[0].get('name', '')
            log_test("Search Students", passed, f"Found {len(results)} results")
            return passed
        else:
            log_test("Search Students", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        log_test("Search Students", False, str(e))
        return False

def test_get_payments(token):
    """Test 10: Get Payments List"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f'{API_URL}/payments/', headers=headers)
        if response.status_code == 200:
            data = response.json()
            has_results = 'results' in data
            count = len(data.get('results', []))
            passed = has_results and count > 0
            log_test("Get Payments List", passed, f"Found {count} payments")
            return passed
        else:
            log_test("Get Payments List", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        log_test("Get Payments List", False, str(e))
        return False

def test_create_subject(token):
    """Test: Create New Subject"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        subject_data = {
            'name': 'Piano Lessons',
            'description': 'Beginner Piano Course',
            'category': 'MUSIC',
            'instructor_name': 'Mrs. Smith',
            'fee_amount': '5000.00',
            'fee_duration': 'YEARLY'
        }
        response = requests.post(f'{API_URL}/subjects/', json=subject_data, headers=headers)
        if response.status_code == 201:
            data = response.json().get('data', {})
            log_test("Create Subject", True, f"Created subject: {data.get('name')}")
            return data
        elif response.status_code == 400:
            # Check if it already exists (assuming unique name)
            log_test("Create Subject", True, "Subject might already exist - fetching list")
            list_response = requests.get(f'{API_URL}/subjects/', headers=headers)
            if list_response.status_code == 200:
                # SubjectViewSet returns 'data' key, not 'results' for listing
                subjects = list_response.json().get('data', [])
                for subj in subjects:
                    if 'piano' in subj['name'].lower():
                        return subj
                # Fallback: return first subject if specific one not found but list has items
                if subjects:
                    log_test("Create Subject", True, "Using existing subject for tests")
                    return subjects[0]
            
        log_test("Create Subject", False, f"Status: {response.status_code}, Error: {response.text[:100]}")
        return None
    except Exception as e:
        log_test("Create Subject", False, str(e))
        return None
def test_search_students(token):
    """Test 9: Search Students"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f'{API_URL}/students/?search=Aarav', headers=headers)
        if response.status_code == 200:
            data = response.json()
            results = data.get('results', [])
            passed = len(results) > 0 and 'Aarav' in results[0].get('name', '')
            log_test("Search Students", passed, f"Found {len(results)} results")
            return passed
        else:
            log_test("Search Students", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        log_test("Search Students", False, str(e))
        return False

def test_get_payments(token):
    """Test 10: Get Payments List"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f'{API_URL}/payments/', headers=headers)
        if response.status_code == 200:
            data = response.json()
            has_results = 'results' in data
            count = len(data.get('results', []))
            passed = has_results and count > 0
            log_test("Get Payments List", passed, f"Found {count} payments")
            return passed
        else:
            log_test("Get Payments List", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        log_test("Get Payments List", False, str(e))
        return False

def test_create_subject(token):
    """Test: Create New Subject"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        subject_data = {
            'name': 'Piano Lessons',
            'description': 'Beginner Piano Course',
            'category': 'MUSIC',
            'instructor_name': 'Mrs. Smith',
            'fee_amount': '5000.00',
            'fee_duration': 'YEARLY'
        }
        response = requests.post(f'{API_URL}/subjects/', json=subject_data, headers=headers)
        passed = response.status_code == 201
        if passed:
            log_test("Create Subject", passed, f"Created subject: {response.json().get('name')}")
            return response.json()
        else:
            log_test("Create Subject", False, f"Status: {response.status_code}, Error: {response.text[:100]}")
            return None
    except Exception as e:
        log_test("Create Subject", False, str(e))
        return None

def test_get_subjects(token):
    """Test: Get Subjects List"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f'{API_URL}/subjects/', headers=headers)
        if response.status_code == 200:
            data = response.json()
            # SubjectViewSet returns 'data' key
            subjects = data.get('data', [])
            count = len(subjects)
            passed = count > 0
            log_test("Get Subjects List", passed, f"Found {count} subjects")
            return passed
        else:
            log_test("Get Subjects List", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        log_test("Get Subjects List", False, str(e))
        return False

def test_create_enrollment(token, student_id, subject_id):
    """Test: Create New Enrollment"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        enrollment_data = {
            'student_id': student_id,
            'subject_id': subject_id
        }
        response = requests.post(f'{API_URL}/enrollments/', json=enrollment_data, headers=headers)
        passed = response.status_code == 201
        if passed:
            log_test("Create Enrollment", passed, f"Enrolled student {student_id} in subject {subject_id}")
            return response.json().get('data', {})
        elif response.status_code == 400 and 'already enrolled' in response.text:
             log_test("Create Enrollment", True, "Student already enrolled (Valid behavior)")
             return {'status': 'already_enrolled'}
        else:
            log_test("Create Enrollment", False, f"Status: {response.status_code}, Error: {response.text[:100]}")
            return None
    except Exception as e:
        log_test("Create Enrollment", False, str(e))
        return None

def test_get_enrollments(token):
    """Test: Get Enrollments List"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f'{API_URL}/enrollments/', headers=headers)
        if response.status_code == 200:
            data = response.json()
            count = len(data.get('results', []))
            passed = count > 0
            log_test("Get Enrollments List", passed, f"Found {count} enrollments")
            return passed
        else:
            log_test("Get Enrollments List", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        log_test("Get Enrollments List", False, str(e))
        return False

def test_unauthorized_access():
    """Test 11: Unauthorized Access (No Token)"""
    try:
        response = requests.get(f'{API_URL}/students/')
        passed = response.status_code == 401
        log_test("Unauthorized Access Blocked", passed, f"Status: {response.status_code}")
        return passed
    except Exception as e:
        log_test("Unauthorized Access Blocked", False, str(e))
        return False

def run_all_tests():
    """Run all automated tests"""
    enrolled_student_id = None
    print("=" * 60)
    print("🧪 AUTOMATED API TESTING")
    print("=" * 60)
    print(f"Testing backend at: {BASE_URL}")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print()
    
    # Test 1: Health Check
    print("📍 Testing Health & Connectivity...")
    test_health_check()
    print()
    
    # Test 2-5: Authentication
    print("🔐 Testing Authentication...")
    test_invalid_login()
    admin_auth = test_admin_login()
    staff_auth = test_staff_login()
    student_auth = test_student_login()
    print()
    
    if not admin_auth:
        print("❌ Admin login failed - cannot continue with authenticated tests")
        return
    
    admin_token = admin_auth['access']
    
    # Test 6-9: Students Management
    print("👥 Testing Students Management...")
    test_get_students(admin_token)
    created_student = test_create_student(admin_token)
    if created_student and 'id' in created_student:
        # Use student_id from response, not 'id'
        enrolled_student_id = created_student['id']
        test_update_student(admin_token, enrolled_student_id)
    test_search_students(admin_token)
    print()
    
    # Test 10: Subjects Management (NEW)
    print("📚 Testing Subjects Management...")
    subject_id = None
    created_subject = test_create_subject(admin_token)
    if created_subject and 'id' in created_subject:
        subject_id = created_subject['id']
    test_get_subjects(admin_token)
    print()

    # Test 11: Enrollments Management (NEW)
    print("📝 Testing Enrollments Management...")
    if enrolled_student_id and subject_id:
        test_create_enrollment(admin_token, enrolled_student_id, subject_id)
        test_get_enrollments(admin_token)
    else:
        print("⚠️ Skipping Enrollment tests - need valid student_id and subject_id")
    print()

    # Test 12: Payments
    print("💰 Testing Payments...")
    test_get_payments(admin_token)
    print()
    
    # Test 13: Security
    print("🔒 Testing Security...")
    test_unauthorized_access()
    print()
    
    # Summary
    print("=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    print(f"✅ Passed: {tests_passed}")
    print(f"❌ Failed: {tests_failed}")
    print(f"📈 Success Rate: {(tests_passed/(tests_passed+tests_failed)*100):.1f}%")
    print("=" * 60)
    
    if tests_failed == 0:
        print("🎉 ALL TESTS PASSED! System is ready for deployment!")
    else:
        print("⚠️  Some tests failed. Review the results above.")
    
    print()
    print("Detailed Results:")
    for result in test_results:
        print(f"  {result}")

if __name__ == '__main__':
    run_all_tests()
