import React, { useState } from 'react';
import { User, Competency } from '../../types';
import { AuthService } from '../../services/authService';
import {
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  Building,
  Briefcase,
  Award,
  ShieldCheck,
  Edit3,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';

interface ProfilePageProps {
  user: User;
  competencies: Competency[];
  onUserUpdate: (updatedUser: User) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  competencies,
  onUserUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone,
    dob: user.dob,
    department: user.department,
    designation: user.designation,
    yearsOfExperience: user.yearsOfExperience,
    profilePhoto: user.profilePhoto,
  });

  const verifiedCount = competencies.filter(
    (c) => c.verification.status === 'Verified' || c.verification.practicalEvidenceVerified
  ).length;
  const criticalGaps = competencies.filter((c) => c.status === 'critical_gap').length;
  const refreshAlerts = competencies.filter(
    (c) => c.decay.status === 'Refresh Recommended' || c.decay.status === 'Critical Decay Alert'
  ).length;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: User = {
      ...user,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      dob: formData.dob,
      department: formData.department,
      designation: formData.designation,
      yearsOfExperience: Number(formData.yearsOfExperience),
      profilePhoto: formData.profilePhoto,
    };

    try {
      const res = await AuthService.updateUserProfile(updated);
      onUserUpdate(res.user);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      onUserUpdate(updated);
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
              Civil Service Identity
            </span>
            <span className="text-xs text-slate-400 font-mono">iGOT ID: {user.iGotId}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Officer Profile
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Official government credentials and statutory competency service record.
          </p>
        </div>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-300 transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile Data</span>
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(false)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
          >
            <span>Cancel</span>
          </button>
        )}
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-2.5 text-xs font-medium animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Profile changes successfully recorded and synchronized to local storage.</span>
        </div>
      )}

      {/* Profile ID Card Visual */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Tricolor Ribbon */}
        <div className="h-1.5 w-full flex">
          <div className="w-1/3 bg-[#FF9933]"></div>
          <div className="w-1/3 bg-white"></div>
          <div className="w-1/3 bg-[#138808]"></div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-slate-100">
            {/* Avatar */}
            <div className="relative">
              <img
                src={user.profilePhoto || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop'}
                alt={user.name}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-200 shadow-md"
              />
              <div className="absolute -bottom-2 -right-2 bg-blue-900 text-white p-1.5 rounded-xl shadow">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900 text-xs font-bold border border-blue-200">
                <span>{user.designation}</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900">{user.name}</h2>
              <p className="text-xs text-slate-500 font-mono">
                iGOT ID: <strong className="text-slate-800">{user.iGotId}</strong> &bull; {user.department}
              </p>
            </div>
          </div>

          {/* Edit Form or Readonly Grid */}
          {isEditing ? (
            <form onSubmit={handleSave} className="pt-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={formData.yearsOfExperience}
                    onChange={(e) =>
                      setFormData({ ...formData, yearsOfExperience: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Profile Photo URL
                  </label>
                  <input
                    type="url"
                    value={formData.profilePhoto}
                    onChange={(e) => setFormData({ ...formData, profilePhoto: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 uppercase tracking-wider font-semibold">Email</span>
                <div className="text-slate-900 font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-900" />
                  {user.email}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 uppercase tracking-wider font-semibold">Phone</span>
                <div className="text-slate-900 font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-900" />
                  {user.phone}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 uppercase tracking-wider font-semibold">Date of Birth</span>
                <div className="text-slate-900 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-900" />
                  {user.dob}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 uppercase tracking-wider font-semibold">Experience</span>
                <div className="text-slate-900 font-medium flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-blue-900" />
                  {user.yearsOfExperience} Years of Official Service
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Competency Summary (Section 23) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
          Statutory Competency Summary Record
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Overall Competency Score
            </span>
            <div className="text-3xl font-black text-blue-900 font-mono mt-1">72%</div>
            <p className="text-[11px] text-slate-500 mt-1">Across 7 official domains</p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
              Verified Competencies
            </span>
            <div className="text-3xl font-black text-emerald-700 font-mono mt-1">
              {verifiedCount}
            </div>
            <p className="text-[11px] text-emerald-600 mt-1">Full practical proof approved</p>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200">
            <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider">
              Critical Gaps
            </span>
            <div className="text-3xl font-black text-rose-700 font-mono mt-1">
              {criticalGaps}
            </div>
            <p className="text-[11px] text-rose-600 mt-1">Python (45%), AI/ML (38%)</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
              Refresh Alerts
            </span>
            <div className="text-3xl font-black text-amber-800 font-mono mt-1">
              {refreshAlerts}
            </div>
            <p className="text-[11px] text-amber-700 mt-1">Ebbinghaus decay warning</p>
          </div>
        </div>
      </div>
    </div>
  );
};
