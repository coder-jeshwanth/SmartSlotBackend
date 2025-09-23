// Validation utility functions

class Validators {
  /**
   * Validate email address
   */
  static validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return { isValid: false, message: 'Email is required' };
    }

    const trimmedEmail = email.trim().toLowerCase();
    
    // Basic email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { isValid: false, message: 'Invalid email format' };
    }

    // Additional business rules for email
    const domain = trimmedEmail.split('@')[1];
    const blockedDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];
    
    if (blockedDomains.includes(domain)) {
      return { isValid: false, message: 'Temporary email addresses are not allowed' };
    }

    return { isValid: true, email: trimmedEmail };
  }

  /**
   * Validate phone number
   */
  static validatePhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return { isValid: false, message: 'Phone number is required' };
    }

    const trimmedPhone = phone.trim();
    
    // Basic international phone format validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    
    if (!phoneRegex.test(trimmedPhone)) {
      return { isValid: false, message: 'Invalid phone number format' };
    }

    // Remove any non-digit characters except +
    const cleanPhone = trimmedPhone.replace(/[^\d+]/g, '');
    
    if (cleanPhone.length < 7 || cleanPhone.length > 17) {
      return { isValid: false, message: 'Phone number must be between 7 and 17 digits' };
    }

    return { isValid: true, phone: cleanPhone };
  }

  /**
   * Validate customer name
   */
  static validateName(name) {
    if (!name || typeof name !== 'string') {
      return { isValid: false, message: 'Name is required' };
    }

    const trimmedName = name.trim();
    
    if (trimmedName.length < 2) {
      return { isValid: false, message: 'Name must be at least 2 characters long' };
    }

    if (trimmedName.length > 100) {
      return { isValid: false, message: 'Name cannot exceed 100 characters' };
    }

    // Check for valid characters (letters, spaces, hyphens, apostrophes)
    const nameRegex = /^[a-zA-Z\s\-\'\.]+$/;
    
    if (!nameRegex.test(trimmedName)) {
      return { isValid: false, message: 'Name contains invalid characters' };
    }

    // Check for at least one letter
    if (!/[a-zA-Z]/.test(trimmedName)) {
      return { isValid: false, message: 'Name must contain at least one letter' };
    }

    return { isValid: true, name: trimmedName };
  }

  /**
   * Validate password strength
   */
  static validatePassword(password) {
    if (!password || typeof password !== 'string') {
      return { isValid: false, message: 'Password is required' };
    }

    if (password.length < 6) {
      return { isValid: false, message: 'Password must be at least 6 characters long' };
    }

    if (password.length > 128) {
      return { isValid: false, message: 'Password cannot exceed 128 characters' };
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one lowercase letter' };
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one uppercase letter' };
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one number' };
    }

    // Optional: Check for special characters
    // if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    //   return { isValid: false, message: 'Password must contain at least one special character' };
    // }

    // Check for common weak passwords
    const weakPasswords = [
      'password', '123456', 'password123', 'admin', 'letmein',
      'welcome', 'monkey', 'dragon', 'qwerty', 'abc123'
    ];

    if (weakPasswords.includes(password.toLowerCase())) {
      return { isValid: false, message: 'Password is too common. Please choose a stronger password' };
    }

    return { isValid: true };
  }

  /**
   * Validate username
   */
  static validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return { isValid: false, message: 'Username is required' };
    }

    const trimmedUsername = username.trim();
    
    if (trimmedUsername.length < 3) {
      return { isValid: false, message: 'Username must be at least 3 characters long' };
    }

    if (trimmedUsername.length > 50) {
      return { isValid: false, message: 'Username cannot exceed 50 characters' };
    }

    // Username can only contain letters, numbers, and underscores
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    
    if (!usernameRegex.test(trimmedUsername)) {
      return { isValid: false, message: 'Username can only contain letters, numbers, and underscores' };
    }

    // Must start with a letter
    if (!/^[a-zA-Z]/.test(trimmedUsername)) {
      return { isValid: false, message: 'Username must start with a letter' };
    }

    // Reserved usernames
    const reservedUsernames = [
      'admin', 'administrator', 'root', 'system', 'user', 'guest',
      'api', 'www', 'mail', 'support', 'help', 'info', 'contact'
    ];

    if (reservedUsernames.includes(trimmedUsername.toLowerCase())) {
      return { isValid: false, message: 'This username is reserved. Please choose another one' };
    }

    return { isValid: true, username: trimmedUsername };
  }

  /**
   * Validate date string (YYYY-MM-DD)
   */
  static validateDateString(dateString) {
    if (!dateString || typeof dateString !== 'string') {
      return { isValid: false, message: 'Date is required' };
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    
    if (!dateRegex.test(dateString)) {
      return { isValid: false, message: 'Date must be in YYYY-MM-DD format' };
    }

    const date = new Date(dateString);
    const isValidDate = date.toISOString().split('T')[0] === dateString;
    
    if (!isValidDate) {
      return { isValid: false, message: 'Invalid date' };
    }

    return { isValid: true, date: dateString };
  }

  /**
   * Validate time string (HH:MM)
   */
  static validateTimeString(timeString) {
    if (!timeString || typeof timeString !== 'string') {
      return { isValid: false, message: 'Time is required' };
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!timeRegex.test(timeString)) {
      return { isValid: false, message: 'Time must be in HH:MM format' };
    }

    return { isValid: true, time: timeString };
  }

  /**
   * Validate booking reference format
   */
  static validateBookingReference(reference) {
    if (!reference || typeof reference !== 'string') {
      return { isValid: false, message: 'Booking reference is required' };
    }

    const refRegex = /^[A-Z]{2}\d+$/;
    
    if (!refRegex.test(reference)) {
      return { isValid: false, message: 'Invalid booking reference format' };
    }

    return { isValid: true, reference };
  }

  /**
   * Validate notes/comments
   */
  static validateNotes(notes, maxLength = 1000) {
    if (!notes) {
      return { isValid: true, notes: '' };
    }

    if (typeof notes !== 'string') {
      return { isValid: false, message: 'Notes must be a string' };
    }

    const trimmedNotes = notes.trim();
    
    if (trimmedNotes.length > maxLength) {
      return { isValid: false, message: `Notes cannot exceed ${maxLength} characters` };
    }

    // Check for potentially harmful content
    const harmfulPatterns = [
      /<script/i,
      /javascript:/i,
      /onload=/i,
      /onerror=/i,
      /<iframe/i
    ];

    for (const pattern of harmfulPatterns) {
      if (pattern.test(trimmedNotes)) {
        return { isValid: false, message: 'Notes contain invalid content' };
      }
    }

    return { isValid: true, notes: trimmedNotes };
  }

  /**
   * Validate MongoDB ObjectId
   */
  static validateObjectId(id) {
    if (!id || typeof id !== 'string') {
      return { isValid: false, message: 'ID is required' };
    }

    // Basic MongoDB ObjectId validation (24 character hex string)
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(id)) {
      return { isValid: false, message: 'Invalid ID format' };
    }

    return { isValid: true, id };
  }

  /**
   * Validate status enum
   */
  static validateStatus(status, allowedValues) {
    if (!status || typeof status !== 'string') {
      return { isValid: false, message: 'Status is required' };
    }

    if (!allowedValues.includes(status)) {
      return { isValid: false, message: `Status must be one of: ${allowedValues.join(', ')}` };
    }

    return { isValid: true, status };
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(page, limit) {
    const result = { isValid: true, page: 1, limit: 10 };

    if (page !== undefined) {
      const pageNum = parseInt(page);
      if (isNaN(pageNum) || pageNum < 1) {
        return { isValid: false, message: 'Page must be a positive integer' };
      }
      result.page = pageNum;
    }

    if (limit !== undefined) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return { isValid: false, message: 'Limit must be between 1 and 100' };
      }
      result.limit = limitNum;
    }

    return result;
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(str) {
    if (typeof str !== 'string') return str;
    
    // Basic HTML entity escaping
    return str.trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Validate complete customer object
   */
  static validateCustomer(customer) {
    const errors = [];

    const nameValidation = this.validateName(customer.name);
    if (!nameValidation.isValid) {
      errors.push({ field: 'name', message: nameValidation.message });
    }

    const emailValidation = this.validateEmail(customer.email);
    if (!emailValidation.isValid) {
      errors.push({ field: 'email', message: emailValidation.message });
    }

    const phoneValidation = this.validatePhone(customer.phone);
    if (!phoneValidation.isValid) {
      errors.push({ field: 'phone', message: phoneValidation.message });
    }

    if (customer.notes) {
      const notesValidation = this.validateNotes(customer.notes);
      if (!notesValidation.isValid) {
        errors.push({ field: 'notes', message: notesValidation.message });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      customer: errors.length === 0 ? {
        name: nameValidation.name,
        email: emailValidation.email,
        phone: phoneValidation.phone,
        notes: customer.notes ? this.validateNotes(customer.notes).notes : ''
      } : null
    };
  }
}

module.exports = Validators;