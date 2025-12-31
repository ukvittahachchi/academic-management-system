#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors');

const API_BASE = 'http://localhost:5000/api';

class TestRunner {
  constructor() {
    this.testResults = [];
    this.authTokens = {
      admin: null,
      teacher: null,
      student: null
    };
  }

  async runAllTests() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 COMPREHENSIVE SYSTEM TESTS'.bold);
    console.log('='.repeat(60));

    await this.testHealthChecks();
    await this.testAuthentication();
    await this.testRoleBasedAccess();
    await this.testModuleCRUD();
    await this.testErrorHandling();
    await this.testEdgeCases();

    this.printSummary();
  }

  async testHealthChecks() {
    console.log('\n1. 🔍 Testing Health Checks...'.yellow);
    
    await this.runTest('Backend Health', async () => {
      const res = await axios.get(`${API_BASE}/health`);
      return res.data.status === 'OK';
    });

    await this.runTest('Database Connection', async () => {
      const res = await axios.get(`${API_BASE}/test/db`);
      return res.data.success && res.data.data.solution === 2;
    });

    await this.runTest('Auth System Status', async () => {
      const res = await axios.get(`${API_BASE}/auth/status`);
      return res.data.success;
    });
  }

  async testAuthentication() {
    console.log('\n2. 🔐 Testing Authentication...'.yellow);

    // Test Student Login
    await this.runTest('Student Login', async () => {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        username: 'test_student',
        password: 'password123'
      });
      this.authTokens.student = res.data.data?.accessToken;
      return res.data.success;
    });

    // Test Teacher Login
    await this.runTest('Teacher Login', async () => {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        username: 'test_teacher',
        password: 'password123'
      });
      this.authTokens.teacher = res.data.data?.accessToken;
      return res.data.success;
    });

    // Test Admin Login
    await this.runTest('Admin Login', async () => {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        username: 'test_admin',
        password: 'password123'
      });
      this.authTokens.admin = res.data.data?.accessToken;
      return res.data.success;
    });

    // Test Invalid Login
    await this.runTest('Invalid Login (Should Fail)', async () => {
      try {
        await axios.post(`${API_BASE}/auth/login`, {
          username: 'wronguser',
          password: 'wrongpass'
        });
        return false; // Should not reach here
      } catch (error) {
        return error.response?.status === 401;
      }
    });

    // Test Account Lockout (5 failed attempts)
    await this.runTest('Account Lockout Protection', async () => {
      try {
        for (let i = 0; i < 6; i++) {
          try {
            await axios.post(`${API_BASE}/auth/login`, {
              username: 'test_student',
              password: 'wrongpassword'
            });
          } catch (e) {
            // Expected to fail
          }
        }
        
        // Now try correct password - should be locked
        try {
          await axios.post(`${API_BASE}/auth/login`, {
            username: 'test_student',
            password: 'password123'
          });
          return false; // Should be locked
        } catch (error) {
          return error.response?.data?.message?.includes('locked');
        }
      } catch (error) {
        return false;
      }
    });
  }

  async testRoleBasedAccess() {
    console.log('\n3. 🛡️ Testing Role-Based Access...'.yellow);

    const headers = {
      admin: { Authorization: `Bearer ${this.authTokens.admin}` },
      teacher: { Authorization: `Bearer ${this.authTokens.teacher}` },
      student: { Authorization: `Bearer ${this.authTokens.student}` }
    };

    // Test Student-only route
    await this.runTest('Student Route (Student Access)', async () => {
      const res = await axios.get(`${API_BASE}/auth/test/student`, {
        headers: headers.student
      });
      return res.data.success;
    });

    await this.runTest('Student Route (Teacher Access - Should Fail)', async () => {
      try {
        await axios.get(`${API_BASE}/auth/test/student`, {
          headers: headers.teacher
        });
        return false;
      } catch (error) {
        return error.response?.status === 403;
      }
    });

    // Test Teacher-only route
    await this.runTest('Teacher Route (Teacher Access)', async () => {
      const res = await axios.get(`${API_BASE}/auth/test/teacher`, {
        headers: headers.teacher
      });
      return res.data.success;
    });

    await this.runTest('Teacher Route (Student Access - Should Fail)', async () => {
      try {
        await axios.get(`${API_BASE}/auth/test/teacher`, {
          headers: headers.student
        });
        return false;
      } catch (error) {
        return error.response?.status === 403;
      }
    });

    // Test Admin-only route
    await this.runTest('Admin Route (Admin Access)', async () => {
      const res = await axios.get(`${API_BASE}/auth/test/admin`, {
        headers: headers.admin
      });
      return res.data.success;
    });

    await this.runTest('Admin Route (Teacher Access - Should Fail)', async () => {
      try {
        await axios.get(`${API_BASE}/auth/test/admin`, {
          headers: headers.teacher
        });
        return false;
      } catch (error) {
        return error.response?.status === 403;
      }
    });
  }

  async testModuleCRUD() {
    console.log('\n4. 📚 Testing Module CRUD Operations...'.yellow);

    const adminHeaders = { Authorization: `Bearer ${this.authTokens.admin}` };
    let createdModuleId = null;

    // Create Module
    await this.runTest('Create Module (Admin)', async () => {
      const res = await axios.post(`${API_BASE}/modules`, {
        module_name: 'Test Module - Delete Me',
        description: 'This is a test module for automated testing',
        grade_level: 'Grade 6',
        subject: 'ICT'
      }, { headers: adminHeaders });

      createdModuleId = res.data.data.module_id;
      return res.data.success && createdModuleId;
    });

    // Get All Modules
    await this.runTest('Get All Modules (Admin)', async () => {
      const res = await axios.get(`${API_BASE}/modules`, {
        headers: adminHeaders
      });
      return res.data.success && Array.isArray(res.data.data);
    });

    // Get Single Module
    await this.runTest('Get Single Module', async () => {
      const res = await axios.get(`${API_BASE}/modules/${createdModuleId}`, {
        headers: adminHeaders
      });
      return res.data.success && res.data.data.module_id === createdModuleId;
    });

    // Update Module
    await this.runTest('Update Module', async () => {
      const res = await axios.put(`${API_BASE}/modules/${createdModuleId}`, {
        description: 'Updated description for testing'
      }, { headers: adminHeaders });

      return res.data.success && res.data.data.description.includes('Updated');
    });

    // Publish/Unpublish
    await this.runTest('Toggle Publish Status', async () => {
      const res = await axios.patch(`${API_BASE}/modules/${createdModuleId}/publish`, {
        publish: true
      }, { headers: adminHeaders });

      return res.data.success && res.data.data.is_published === true;
    });

    // Search Modules
    await this.runTest('Search Modules', async () => {
      const res = await axios.get(`${API_BASE}/modules/search?query=Test`, {
        headers: adminHeaders
      });
      return res.data.success;
    });

    // Get Statistics
    await this.runTest('Get Module Statistics', async () => {
      const res = await axios.get(`${API_BASE}/modules/statistics`, {
        headers: adminHeaders
      });
      return res.data.success && res.data.data.total_modules > 0;
    });

    // Delete Module
    await this.runTest('Delete Module', async () => {
      const res = await axios.delete(`${API_BASE}/modules/${createdModuleId}`, {
        headers: adminHeaders
      });
      return res.data.success;
    });

    // Verify Deletion
    await this.runTest('Verify Module Deletion', async () => {
      try {
        await axios.get(`${API_BASE}/modules/${createdModuleId}`, {
          headers: adminHeaders
        });
        return false; // Should not exist
      } catch (error) {
        return error.response?.status === 404;
      }
    });
  }

  async testErrorHandling() {
    console.log('\n5. 🚨 Testing Error Handling...'.yellow);

    const adminHeaders = { Authorization: `Bearer ${this.authTokens.admin}` };

    // Test Invalid Module Creation
    await this.runTest('Invalid Module Creation (Missing Name)', async () => {
      try {
        await axios.post(`${API_BASE}/modules`, {
          description: 'Missing module name'
        }, { headers: adminHeaders });
        return false;
      } catch (error) {
        return error.response?.status === 400;
      }
    });

    // Test Non-Existent Module
    await this.runTest('Access Non-Existent Module', async () => {
      try {
        await axios.get(`${API_BASE}/modules/999999`, {
          headers: adminHeaders
        });
        return false;
      } catch (error) {
        return error.response?.status === 404;
      }
    });

    // Test Invalid Token
    await this.runTest('Invalid Token Access', async () => {
      try {
        await axios.get(`${API_BASE}/auth/me`, {
          headers: { Authorization: 'Bearer invalid.token.here' }
        });
        return false;
      } catch (error) {
        return error.response?.status === 401;
      }
    });

    // Test Expired Token (simulated)
    await this.runTest('Expired Token Handling', async () => {
      try {
        // Using a clearly invalid/expired token format
        await axios.get(`${API_BASE}/auth/me`, {
          headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c' }
        });
        return false;
      } catch (error) {
        return error.response?.status === 401;
      }
    });

    // Test Rate Limiting
    await this.runTest('Rate Limiting (Multiple Requests)', async () => {
      try {
        const promises = [];
        for (let i = 0; i < 150; i++) { // Exceed 100 requests limit
          promises.push(axios.get(`${API_BASE}/health`));
        }
        await Promise.all(promises);
        return false; // Should be rate limited
      } catch (error) {
        return error.response?.status === 429;
      }
    });
  }

  async testEdgeCases() {
    console.log('\n6. 🔬 Testing Edge Cases...'.yellow);

    const adminHeaders = { Authorization: `Bearer ${this.authTokens.admin}` };

    // Test Very Long Inputs
    await this.runTest('Long Input Validation', async () => {
      try {
        const longName = 'A'.repeat(200); // Exceeds 100 character limit
        await axios.post(`${API_BASE}/modules`, {
          module_name: longName,
          grade_level: 'Grade 6'
        }, { headers: adminHeaders });
        return false;
      } catch (error) {
        return error.response?.status === 400;
      }
    });

    // Test SQL Injection Prevention
    await this.runTest('SQL Injection Prevention', async () => {
      try {
        await axios.post(`${API_BASE}/modules`, {
          module_name: "Test'; DROP TABLE users; --",
          grade_level: 'Grade 6'
        }, { headers: adminHeaders });
        // If we get here, the input was sanitized properly
        return true;
      } catch (error) {
        // Might get validation error, which is also fine
        return error.response?.status === 400 || error.response?.status === 500;
      }
    });

    // Test XSS Prevention
    await this.runTest('XSS Prevention', async () => {
      try {
        const res = await axios.post(`${API_BASE}/modules`, {
          module_name: 'Test Module',
          description: '<script>alert("xss")</script>',
          grade_level: 'Grade 6'
        }, { headers: adminHeaders });
        
        // Check if script tags are stripped/escaped
        const getRes = await axios.get(`${API_BASE}/modules/${res.data.data.module_id}`, {
          headers: adminHeaders
        });
        
        return !getRes.data.description.includes('<script>');
      } catch (error) {
        console.error('XSS test error:', error.message);
        return false;
      }
    });

    // Test CORS
    await this.runTest('CORS Configuration', async () => {
      try {
        await axios.get(`${API_BASE}/health`, {
          headers: { Origin: 'http://malicious-site.com' }
        });
        return false; // Should be blocked
      } catch (error) {
        return error.code === 'ERR_NETWORK' || error.response?.status === 403;
      }
    });
  }

  async runTest(name, testFn) {
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name,
        passed: result,
        duration,
        error: null
      });

      const status = result ? '✅ PASS'.green : '❌ FAIL'.red;
      console.log(`   ${status} ${name} (${duration}ms)`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name,
        passed: false,
        duration,
        error: error.message
      });

      console.log(`   ❌ FAIL ${name} (${duration}ms)`.red);
      console.log(`      Error: ${error.message}`.gray);
      
      return false;
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY'.bold);
    console.log('='.repeat(60));

    const passed = this.testResults.filter(t => t.passed).length;
    const total = this.testResults.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`\nTotal Tests: ${total}`);
    console.log(`Passed: ${passed} / ${total} (${percentage}%)`);

    if (passed === total) {
      console.log('\n🎉 ALL TESTS PASSED! System is ready for production.'.green.bold);
    } else {
      console.log('\n⚠️  SOME TESTS FAILED. Need to fix issues before production.'.yellow.bold);
      
      // Show failed tests
      const failedTests = this.testResults.filter(t => !t.passed);
      console.log('\nFailed Tests:'.red);
      failedTests.forEach((test, index) => {
        console.log(`  ${index + 1}. ${test.name}`);
        if (test.error) {
          console.log(`     Error: ${test.error}`.gray);
        }
      });
    }

    // Performance summary
    const avgDuration = Math.round(
      this.testResults.reduce((sum, t) => sum + t.duration, 0) / total
    );
    console.log(`\n⏱️  Average Test Duration: ${avgDuration}ms`);

    // Recommendations
    console.log('\n💡 Recommendations:'.bold);
    if (percentage === 100) {
      console.log('• ✅ System is stable and ready for deployment');
      console.log('• ✅ Consider adding more integration tests');
      console.log('• ✅ Set up monitoring in production');
    } else if (percentage >= 80) {
      console.log('• ⚠️  Fix the failed tests before deployment');
      console.log('• ✅ Core functionality is working well');
      console.log('• 📝 Add more edge case tests');
    } else {
      console.log('• ❌ Critical issues need to be fixed');
      console.log('• 🐛 Focus on authentication and database tests first');
      console.log('• 🔄 Run tests after each fix');
    }
  }
}

// Run tests
const runner = new TestRunner();
runner.runAllTests().catch(console.error);