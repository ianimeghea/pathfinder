import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { X, Mail, Lock, Loader2, Compass } from 'lucide-react';
import './AuthModal.css';

const AuthModal = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Close modal if clicking on the dark overlay background
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="auth-overlay" onClick={handleOverlayClick}>
      <div className="auth-modal">
        
        <div className="auth-header">
          <div className="auth-brand">
            <Compass size={24} color="#333" />
            <h2 className="auth-title">
              {isSignUp ? 'Join Pathfinder' : 'Welcome Back'}
            </h2>
          </div>
          <button className="auth-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} color="#666" />
          </button>
        </div>

        <form onSubmit={handleAuth} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          
          <div className="auth-input-group">
            <Mail size={16} className="auth-icon" />
            <input 
              className="auth-input"
              type="email" 
              placeholder="Email address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="auth-input-group">
            <Lock size={16} className="auth-icon" />
            <input 
              className="auth-input"
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? <Loader2 className="spinner" size={20} /> : (isSignUp ? 'Create Account' : 'Log In')}
          </button>
          
          <div className="auth-footer" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? (
              <span>Already have an account? <span className="auth-link">Log In</span></span>
            ) : (
              <span>New to Pathfinder? <span className="auth-link">Create Account</span></span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;