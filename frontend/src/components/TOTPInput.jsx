import { useState, useRef, useEffect } from 'react';
import { Shield, Loader2 } from 'lucide-react';

export default function TOTPInput({ onVerify, error: externalError }) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (externalError) {
      setError(externalError);
    }
  }, [externalError]);

  const handleChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (newCode.every(digit => digit !== '') && value) {
      handleSubmit(newCode.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        if (digits.length === 6) {
          setCode(digits);
          handleSubmit(digits.join(''));
        }
      });
    }
  };

  const handleSubmit = async (codeString) => {
    if (codeString.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      await onVerify(codeString);
    } catch (err) {
      setError(err.message || 'Invalid or expired code');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('');
    
    if (digits.length === 6) {
      setCode(digits);
      handleSubmit(digits.join(''));
    }
  };

  return (
    <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Two-Factor Authentication Required
        </h3>
      </div>

      <p className="text-sm text-gray-700 mb-6">
        This message is protected with TOTP. Enter the 6-digit code from your authenticator app to continue.
      </p>

      <div className="flex justify-center gap-2 mb-4" onPaste={handlePaste}>
        {code.map((digit, index) => (
          <input
            key={index}
            ref={el => inputRefs.current[index] = el}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            disabled={isVerifying}
            className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg 
              ${error 
                ? 'border-red-400 bg-red-50' 
                : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
              } 
              transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-300 rounded-lg mb-4">
          <p className="text-sm text-red-800 text-center">{error}</p>
        </div>
      )}

      {isVerifying && (
        <div className="flex items-center justify-center gap-2 text-blue-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Verifying code...</span>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
        <p className="text-xs text-blue-900">
          <strong>💡 Tip:</strong> Codes change every 30 seconds. If the code doesn't work, 
          wait for the next code to generate in your authenticator app.
        </p>
      </div>
    </div>
  );
}
