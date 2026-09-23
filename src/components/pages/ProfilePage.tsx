import React, { useState } from 'react';
import { User, Competency } from '../../types';
import { AuthService } from '../../services/authService';
import {
  Mail,
  Phone,
  Calendar,
  Briefcase,
  ShieldCheck,
  Edit3,
  Save,
  CheckCircle2,
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
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-[#FFFDFC] rounded-2xl border border-[#DED2C5] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B4A35] bg-[#EEE4D8] border border-[#CBB9A7] px-2.5 py-0.5 rounded-md">
              Civil Service Identity
            </span>
            <span className="text-xs text-[#6E625A] font-mono">iGOT ID: {user.iGotId}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2F2520] tracking-tight">
            Officer Profile
          </h1>
          <p className="text-sm text-[#6E625A] mt-1">
            Official government credentials and statutory competency service record.
          </p>
        </div>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EEE4D8] hover:bg-[#DED2C5] text-[#3A2921] text-xs font-semibold border border-[#CBB9A7] transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#6B4A35]" />
            <span>Edit Profile Data</span>
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(false)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F8F3EB] text-[#6E625A] border border-[#DED2C5] text-xs font-semibold cursor-pointer"
          >
            <span>Cancel</span>
          </button>
        )}
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-[#EFF6EF] border border-[#A8C9AC] text-[#1F5E2A] flex items-center gap-2.5 text-xs font-medium animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#547A5A] shrink-0" />
          <span>Profile changes successfully recorded and synchronized to local storage.</span>
        </div>
      )}

      {/* Profile ID Card Visual */}
      <div className="bg-[#FFFDFC] rounded-2xl border border-[#DED2C5] overflow-hidden shadow-xs">
        {/* Tricolor Ribbon */}
        <div className="h-1.5 w-full flex">
          <div className="w-1/3 bg-[#FF9933]"></div>
          <div className="w-1/3 bg-white"></div>
          <div className="w-1/3 bg-[#138808]"></div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-[#EEE4D8]">
            {/* Avatar */}
            <div className="relative">
              <img
                src={user.profilePhoto || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&auto=format&fit=crop'}
                alt={user.name}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-[#DED2C5] shadow-xs"
              />
              <div className="absolute -bottom-2 -right-2 bg-[#6B4A35] text-[#FFFDFC] p-1.5 rounded-xl shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#EEE4D8] text-[#6B4A35] text-xs font-bold border border-[#CBB9A7]">
                <span>{user.designation}</span>
              </div>
              <h2 className="text-2xl font-black text-[#2F2520]">{user.name}</h2>
              <p className="text-xs text-[#6E625A] font-mono">
                iGOT ID: <strong className="text-[#2F2520]">{user.iGotId}</strong> &bull; {user.department}
              </p>
            </div>
          </div>

          {/* Edit Form or Readonly Grid */}
          {isEditing ? (
            <form onSubmit={handleSave} className="pt-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#2F2520] uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FBF8F2] border border-[#CBB9A7] rounded-lg text-sm text-[#2F2520] focus:ring-2 focus:ring-[#6B4A35]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2F2520] uppercase mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FBF8F2] border border-[#CBB9A7] rounded-lg text-sm text-[#2F2520] focus:ring-2 focus:ring-[#6B4A35]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2F2520] uppercase mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FBF8F2] border border-[#CBB9A7] rounded-lg text-sm text-[#2F2520] focus:ring-2 focus:ring-[#6B4A35]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2F2520] uppercase mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FBF8F2] border border-[#CBB9A7] rounded-lg text-sm text-[#2F2520] focus:ring-2 focus:ring-[#6B4A35]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2F2520] uppercase mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FBF8F2] border border-[#CBB9A7] rounded-lg text-sm text-[#2F2520] focus:ring-2 focus:ring-[#6B4A35]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2F2520] uppercase mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FBF8F2] border border-[#CBB9A7] rounded-lg text-sm text-[#2F2520] focus:ring-2 focus:ring-[#6B4A35]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2F2520] uppercase mb-1">
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
                    className="w-full px-3 py-2 bg-[#FBF8F2] border border-[#CBB9A7] rounded-lg text-sm text-[#2F2520] focus:ring-2 focus:ring-[#6B4A35]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#2F2520] uppercase mb-1">
                    Profile Photo URL
                  </label>
                  <input
                    type="url"
                    value={formData.profilePhoto}
                    onChange={(e) => setFormData({ ...formData, profilePhoto: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FBF8F2] border border-[#CBB9A7] rounded-lg text-sm text-[#2F2520] focus:ring-2 focus:ring-[#6B4A35]"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#6B4A35] hover:bg-[#523625] text-[#FBF8F2] font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
              <div className="space-y-1">
                <span className="text-[#93877D] uppercase tracking-wider font-semibold">Email</span>
                <div className="text-[#2F2520] font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#6B4A35]" />
                  {user.email}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[#93877D] uppercase tracking-wider font-semibold">Phone</span>
                <div className="text-[#2F2520] font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#6B4A35]" />
                  {user.phone}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[#93877D] uppercase tracking-wider font-semibold">Date of Birth</span>
                <div className="text-[#2F2520] font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#6B4A35]" />
                  {user.dob}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[#93877D] uppercase tracking-wider font-semibold">Experience</span>
                <div className="text-[#2F2520] font-medium flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-[#6B4A35]" />
                  {user.yearsOfExperience} Years of Official Service
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Competency Summary */}
      <div className="bg-[#FFFDFC] rounded-2xl border border-[#DED2C5] p-6 sm:p-8 shadow-xs">
        <h3 className="text-base font-bold text-[#2F2520] mb-4 pb-3 border-b border-[#EEE4D8]">
          Statutory Competency Summary Record
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#F8F3EB] border border-[#DED2C5]">
            <span className="text-[11px] font-bold text-[#6E625A] uppercase tracking-wider">
              Overall Competency Score
            </span>
            <div className="text-3xl font-black text-[#6B4A35] font-mono mt-1">72%</div>
            <p className="text-[11px] text-[#6E625A] mt-1">Across 7 official domains</p>
          </div>

          <div className="p-4 rounded-xl bg-[#EFF6EF] border border-[#A8C9AC]">
            <span className="text-[11px] font-bold text-[#2E5B34] uppercase tracking-wider">
              Verified Competencies
            </span>
            <div className="text-3xl font-black text-[#1F5E2A] font-mono mt-1">
              {verifiedCount}
            </div>
            <p className="text-[11px] text-[#2E5B34] mt-1">Full practical proof approved</p>
          </div>

          <div className="p-4 rounded-xl bg-[#FBF0EF] border border-[#D4958F]">
            <span className="text-[11px] font-bold text-[#7A2E2A] uppercase tracking-wider">
              Critical Gaps
            </span>
            <div className="text-3xl font-black text-[#9A4B42] font-mono mt-1">
              {criticalGaps}
            </div>
            <p className="text-[11px] text-[#7A2E2A] mt-1">Python (45%), AI/ML (38%)</p>
          </div>

          <div className="p-4 rounded-xl bg-[#FDF6EC] border border-[#D4A96A]">
            <span className="text-[11px] font-bold text-[#7A4F1E] uppercase tracking-wider">
              Refresh Alerts
            </span>
            <div className="text-3xl font-black text-[#A97838] font-mono mt-1">
              {refreshAlerts}
            </div>
            <p className="text-[11px] text-[#7A4F1E] mt-1">Ebbinghaus decay warning</p>
          </div>
        </div>
      </div>
    </div>
  );
};
