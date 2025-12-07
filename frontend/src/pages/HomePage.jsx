import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, Lock, Zap, Shield, Clock, FileImage } from 'lucide-react';

function HomePage() {
  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-orange-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center animate-fade-in">
            <div className="flex justify-center mb-6">
              <Flame className="w-20 h-20 text-primary-600" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Burn After Reading
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Send encrypted messages and files that self-destruct after one read. 
              No traces. No backups. Complete privacy.
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/create" className="btn-primary text-lg">
                Create Secure Message
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Military-Grade Security
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Lock className="w-8 h-8" />}
              title="Client-Side Encryption"
              description="AES-256-GCM encryption happens in your browser. Your password never leaves your device."
            />
            
            <FeatureCard
              icon={<Flame className="w-8 h-8" />}
              title="One-Time Access"
              description="Messages are permanently deleted after the first successful decryption. No backups, no recovery."
            />
            
            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title="Password Protected"
              description="PBKDF2 key derivation ensures strong password-based security. Only you and the recipient can decrypt."
            />
            
            <FeatureCard
              icon={<FileImage className="w-8 h-8" />}
              title="Media Support"
              description="Encrypt and share images, documents, and files up to 100MB. All encrypted end-to-end."
            />
            
            <FeatureCard
              icon={<Clock className="w-8 h-8" />}
              title="Auto-Expiration"
              description="Set optional time limits. Messages automatically delete after expiration, even if unread."
            />
            
            <FeatureCard
              icon={<Zap className="w-8 h-8" />}
              title="Lightning Fast"
              description="Powered by Cloudflare's global network. Instant encryption, decryption, and delivery worldwide."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Create & Encrypt"
              description="Write your message, set a password. Everything is encrypted in your browser before being sent."
            />
            
            <StepCard
              number="2"
              title="Share Link"
              description="Get a unique shareable link. Send it along with the password (separately!) to your recipient."
            />
            
            <StepCard
              number="3"
              title="Read & Burn"
              description="Recipient enters password to decrypt and read once. Message is permanently deleted immediately."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Send a Secure Message?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Free, anonymous, and completely secure. No registration required.
          </p>
          <Link to="/create" className="bg-white text-primary-600 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg text-lg transition-all duration-200 inline-block shadow-lg">
            Get Started Now
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="card hover:shadow-xl transition-shadow duration-200">
      <div className="text-primary-600 mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-600 text-white text-2xl font-bold mb-4">
        {number}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

export default HomePage;
