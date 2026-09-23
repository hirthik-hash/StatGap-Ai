import React from 'react';
import { LogOut, AlertTriangle } from 'lucide-react';

interface LogoutModalProps {
  isOpen: boolean;
  onCancel?: () => void;
  onClose?: () => void;
  onConfirm: () => void;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({ isOpen, onCancel, onClose, onConfirm }) => {
  if (!isOpen) return null;
  const handleCancel = onCancel || onClose || (() => {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2A1E19]/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FFFDFC] rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#DED2C5]">
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#FBF0EF] border border-[#D4958F] flex items-center justify-center text-[#9A4B42] shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#2F2520]">Confirm Logout</h3>
            <p className="text-xs text-[#6E625A]">Official Statistical System Secure Session</p>
          </div>
        </div>

        <p className="text-sm text-[#6E625A] mb-6 leading-relaxed">
          Are you sure you want to logout? Your current session will be securely terminated. You will need your iGOT ID and password to access competency intelligence again.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-xs font-semibold text-[#3A2921] hover:text-[#2A1E19] bg-[#EEE4D8] hover:bg-[#DED2C5] border border-[#CBB9A7] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#FBF8F2] bg-[#9A4B42] hover:bg-[#7A2E2A] rounded-lg shadow-sm transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};
