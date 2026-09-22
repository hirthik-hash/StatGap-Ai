import React, { useState } from 'react';
import { User } from '../../types';
import { AuthService } from '../../services/authService';
import { Shield, UserPlus, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

interface RegisterPageProps {
  onNavigateLogin: () => void;
  onRegisteredSuccess: (message: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onNavigateLogin,
  onRegisteredSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    iGotId: '',
    email: '',
    phone: '',
    dob: '1995-05-15',
    department: 'Official Statistics Division',
    designation: 'Statistical Officer',
    yearsOfExperience: 3,
    password: '',
    confirmPassword: '',
    profilePhoto: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const departments = [
    'Official Statistics Division',
    'Ministry of Statistics',
    'State Statistical Department',
    'Survey Division',
    'Data Analytics Division',
  ];

  const designations = [
    'Statistical Officer',
    'Senior Statistical Officer',
    'Data Analyst',
    'Research Officer',
    'Survey Officer',
  ];

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    // Name
    const nameTrim = formData.name.trim();
    if (!nameTrim) {
      errs.name = 'Full Name is required.';
    } else if (!/^[A-Za-z\s.'-]+$/.test(nameTrim)) {
      errs.name = 'Full Name contains invalid characters.';
    }

    // iGOT ID
    if (!formData.iGotId.trim()) {
      errs.iGotId = 'iGOT ID is required.';
    } else if (formData.iGotId.trim().length < 6) {
      errs.iGotId = 'iGOT ID should be at least 6 characters.';
    }

    // Email
    if (!formData.email.trim()) {
      errs.email = 'Official Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    // Phone: exactly 10 digits
    if (!formData.phone.trim()) {
      errs.phone = 'Phone number is required.';
    } else if (!/^\d{10}$/.test(formData.phone.trim())) {
      errs.phone = 'Phone number must be exactly 10 digits (numbers only).';
    }

    // DOB
    if (!formData.dob) {
      errs.dob = 'Date of birth is required.';
    }

    // Password: min 8 characters
    if (!formData.password) {
      errs.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    }

    // Confirm Password
    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validate()) {
      return;
    }

    // Register user
    const newUser: User = {
      name: formData.name.trim(),
      iGotId: formData.iGotId.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      dob: formData.dob,
      department: formData.department,
      designation: formData.designation,
      yearsOfExperience: Number(formData.yearsOfExperience) || 0,
      password: formData.password,
      profilePhoto:
        formData.profilePhoto.trim() ||
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop',
    };

    try {
      const res = await AuthService.register(newUser);
      if (res.success) {
        onRegisteredSuccess(res.message);
      } else {
        setGeneralError(res.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setGeneralError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c1a30] via-[#0f2444] to-[#0a1526] text-white py-10 px-4 sm:px-6 selection:bg-blue-600 selection:text-white">
      {/* Top tricolor */}
      <div className="fixed top-0 left-0 right-0 h-1.5 flex z-50">
        <div className="w-1/3 bg-[#FF9933]"></div>
        <div className="w-1/3 bg-white"></div>
        <div className="w-1/3 bg-[#138808]"></div>
      </div>

      <div className="max-w-2xl mx-auto mt-4">
        {/* Header link back */}
        <button
          onClick={onNavigateLogin}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-300 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>

        <div className="bg-white rounded-2xl p-6 sm:p-8 text-slate-900 shadow-2xl border border-slate-200">
          <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Officer Registration</h2>
              <p className="text-xs text-slate-500">
                Enroll into India's Official Statistical System Competency Intelligence Layer
              </p>
            </div>
          </div>

          {generalError && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{generalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Sen"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white ${
                    errors.name ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300'
                  }`}
                />
                {errors.name && <p className="text-rose-600 mt-1">{errors.name}</p>}
              </div>

              {/* iGOT ID */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  iGOT ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IGOT202600987"
                  value={formData.iGotId}
                  onChange={(e) => setFormData({ ...formData, iGotId: e.target.value })}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white ${
                    errors.iGotId ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300'
                  }`}
                />
                {errors.iGotId && <p className="text-rose-600 mt-1">{errors.iGotId}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Official Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="officer.name@gov.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white ${
                    errors.email ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300'
                  }`}
                />
                {errors.email && <p className="text-rose-600 mt-1">{errors.email}</p>}
              </div>

              {/* Phone (10 digits) */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone (10 Digits) *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white ${
                    errors.phone ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300'
                  }`}
                />
                {errors.phone && <p className="text-rose-600 mt-1">{errors.phone}</p>}
              </div>

              {/* DOB */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  required
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white ${
                    errors.dob ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300'
                  }`}
                />
                {errors.dob && <p className="text-rose-600 mt-1">{errors.dob}</p>}
              </div>

              {/* Years of Experience */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min={0}
                  max={45}
                  value={formData.yearsOfExperience}
                  onChange={(e) => setFormData({ ...formData, yearsOfExperience: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Department *
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Designation */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Designation *
                </label>
                <select
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                >
                  {designations.map((desig) => (
                    <option key={desig} value={desig}>
                      {desig}
                    </option>
                  ))}
                </select>
              </div>

              {/* Password */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password (Min 8 Characters) *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white ${
                    errors.password ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300'
                  }`}
                />
                {errors.password && <p className="text-rose-600 mt-1">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white ${
                    errors.confirmPassword ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300'
                  }`}
                />
                {errors.confirmPassword && <p className="text-rose-600 mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Profile Photo URL (Optional) */}
            <div className="pt-1">
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Profile Photo URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://... or leave empty for default avatar"
                value={formData.profilePhoto}
                onChange={(e) => setFormData({ ...formData, profilePhoto: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={onNavigateLogin}
                className="text-xs text-slate-600 hover:text-slate-900 underline"
              >
                Already have an iGOT account? Log in
              </button>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 active:scale-98 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Shield className="w-4 h-4" />
                <span>Complete Registration</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
