"""
Test Runner for Wallet & Verification System
Run all unit tests with coverage reporting
"""
import pytest
import sys


def run_tests():
    """Run all tests with coverage"""
    args = [
        'tests/',
        '-v',
        '--cov=modules/verification',
        '--cov=modules/wallet',
        '--cov-report=term-missing',
        '--cov-report=html:htmlcov',
        '--tb=short'
    ]
    
    print("=" * 80)
    print("Running Wallet & Verification System Tests")
    print("=" * 80)
    
    exit_code = pytest.main(args)
    
    if exit_code == 0:
        print("\n" + "=" * 80)
        print("✅ All tests passed!")
        print("=" * 80)
        print("\nCoverage report saved to: htmlcov/index.html")
    else:
        print("\n" + "=" * 80)
        print("❌ Some tests failed. Please check the output above.")
        print("=" * 80)
    
    return exit_code


def run_specific_test(test_file):
    """Run specific test file"""
    args = [
        f'tests/{test_file}',
        '-v',
        '--tb=short'
    ]
    return pytest.main(args)


if __name__ == '__main__':
    if len(sys.argv) > 1:
        # Run specific test file
        test_file = sys.argv[1]
        sys.exit(run_specific_test(test_file))
    else:
        # Run all tests
        sys.exit(run_tests())
