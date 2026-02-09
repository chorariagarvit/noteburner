import React, { useState, useEffect } from 'react';

/**
 * Password Strength Meter
 * Analyzes password strength and provides visual feedback
 */
const PasswordStrengthMeter = ({ password, onChange }) => {
  const [strength, setStrength] = useState({
    score: 0,
    label: 'Too weak',
    color: 'bg-red-500',
    suggestions: []
  });

  useEffect(() => {
    if (!password) {
      setStrength({
        score: 0,
        label: 'Too weak',
        color: 'bg-red-500',
        suggestions: []
      });
      return;
    }

    const analysis = analyzePassword(password);
    setStrength(analysis);
    
    // Notify parent component of strength
    if (onChange) {
      onChange(analysis.score >= 3); // Minimum acceptable strength
    }
  }, [password, onChange]);

  const analyzePassword = (pwd) => {
    let score = 0;
    const suggestions = [];

    // Length check
    if (pwd.length >= 8) score++;
    else suggestions.push('Use at least 8 characters');

    if (pwd.length >= 12) score++;
    else if (pwd.length >= 8) suggestions.push('12+ characters recommended');

    // Character variety
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) {
      score++;
    } else {
      suggestions.push('Mix uppercase and lowercase letters');
    }

    if (/\d/.test(pwd)) {
      score++;
    } else {
      suggestions.push('Include numbers');
    }

    if (/[^a-zA-Z0-9]/.test(pwd)) {
      score++;
    } else {
      suggestions.push('Add special characters (!@#$%^&*)');
    }

    // Check for common patterns
    const commonPatterns = [
      /^123456/,
      /password/i,
      /qwerty/i,
      /^(.)\1+$/, // Repeated characters
      /^(012|abc|xyz)/i
    ];

    const hasCommonPattern = commonPatterns.some(pattern => pattern.test(pwd));
    if (hasCommonPattern) {
      score = Math.max(0, score - 2);
      suggestions.push('Avoid common patterns');
    }

    // Calculate entropy (randomness)
    const entropy = calculateEntropy(pwd);
    if (entropy < 30) {
      suggestions.push('Password is too predictable');
    }

    // Determine label and color
    let label, color, textColor;
    if (score <= 1) {
      label = 'Too weak';
      color = 'bg-red-500';
      textColor = 'text-red-500';
    } else if (score === 2) {
      label = 'Weak';
      color = 'bg-orange-500';
      textColor = 'text-orange-500';
    } else if (score === 3) {
      label = 'Fair';
      color = 'bg-yellow-500';
      textColor = 'text-yellow-500';
    } else if (score === 4) {
      label = 'Good';
      color = 'bg-blue-500';
      textColor = 'text-blue-500';
    } else {
      label = 'Strong';
      color = 'bg-green-500';
      textColor = 'text-green-500';
    }

    return { score, label, color, textColor, suggestions, entropy };
  };

  const calculateEntropy = (pwd) => {
    // Simplified entropy calculation
    const charSets = [
      { regex: /[a-z]/, size: 26 },
      { regex: /[A-Z]/, size: 26 },
      { regex: /\d/, size: 10 },
      { regex: /[^a-zA-Z0-9]/, size: 32 }
    ];

    let poolSize = 0;
    charSets.forEach(set => {
      if (set.regex.test(pwd)) {
        poolSize += set.size;
      }
    });

    return pwd.length * Math.log2(poolSize);
  };

  if (!password) return null;

  return (
    <div className="mt-3 space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${strength.color} transition-all duration-300`}
            style={{ width: `${(strength.score / 5) * 100}%` }}
          />
        </div>
        <span className={`text-sm font-medium ${strength.textColor}`}>
          {strength.label}
        </span>
      </div>

      {/* Entropy indicator */}
      {strength.entropy && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Entropy: {Math.round(strength.entropy)} bits
          {strength.entropy < 30 && ' (too low)'}
          {strength.entropy >= 30 && strength.entropy < 50 && ' (acceptable)'}
          {strength.entropy >= 50 && ' (good)'}
        </div>
      )}

      {/* Suggestions */}
      {strength.suggestions.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
            💡 Strengthen your password:
          </p>
          <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
            {strength.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Success message */}
      {strength.score >= 4 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <p className="text-sm text-green-700 dark:text-green-300">
            ✅ Great! Your password is strong and secure.
          </p>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
