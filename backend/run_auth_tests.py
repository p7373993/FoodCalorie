#!/usr/bin/env python
"""
Challenge Authentication Tests Runner
Runs all authentication-related tests for the challenge system
"""

import os
import sys
import django
from django.conf import settings
from django.test.utils import get_runner

if __name__ == "__main__":
    os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
    django.setup()
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    
    # Run specific authentication test classes
    test_labels = [
        'challenges.test_authentication.SessionAuthenticationTestCase',
        'challenges.test_authentication.PermissionBasedAccessTestCase', 
        'challenges.test_authentication.IntegrationTestCase',
        'challenges.test_authentication.PermissionValidationTestCase',
        'challenges.test_authentication.APISecurityTestCase',
        'challenges.test_authentication.ChallengeFlowIntegrationTestCase'
    ]
    
    print("Running Challenge Authentication Tests...")
    print("=" * 50)
    
    failures = test_runner.run_tests(test_labels)
    
    if failures:
        print(f"\n❌ {failures} test(s) failed")
        sys.exit(1)
    else:
        print("\n✅ All authentication tests passed!")
        sys.exit(0)