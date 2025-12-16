import { X } from 'lucide-react';
import './LogoutModal.css';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userEmail: string;
}

const LogoutModal = ({ isOpen, onClose, onConfirm, userEmail }: LogoutModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
        <div className="logout-modal-header">
          <h2>Are you sure you want to log out?</h2>
        </div>
        <div className="logout-modal-body">
          <p>Log out of Assistly as <strong>{userEmail}</strong>?</p>
        </div>
        <div className="logout-modal-actions">
          <button className="btn-logout-confirm" onClick={onConfirm}>
            Log out
          </button>
          <button className="btn-logout-cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;


