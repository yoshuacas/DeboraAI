/**
 * Example unit test to validate Jest configuration
 */

describe('Example Unit Test', () => {
  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should perform basic arithmetic', () => {
    const sum = 2 + 2;
    expect(sum).toBe(4);
  });

  it('should handle arrays', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });

  it('should handle objects', () => {
    const obj = { name: 'Test', value: 123 };
    expect(obj).toHaveProperty('name');
    expect(obj.name).toBe('Test');
  });
});

/**
 * Example utility function test
 */
describe('Utility Functions', () => {
  // Example: Testing a simple validation function
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });
});
