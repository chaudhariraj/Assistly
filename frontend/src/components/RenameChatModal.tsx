import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import './RenameChatModal.css';

interface RenameChatModalProps {
  isOpen: boolean;
  currentName: string;
  onClose: () => void;
  onSave: (newName: string) => void;
}

const RenameChatModal = ({ isOpen, onClose, onSave, currentName }: RenameChatModalProps) => {
  const [newName, setNewName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNewName(currentName);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, currentName]);

  const handleSave = () => {
    if (newName.trim()) {
      onSave(newName.trim());
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="rename-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rename-modal-header">
          <h3>Rename chat</h3>
          <button className="rename-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="rename-modal-body">
          <input
            ref={inputRef}
            type="text"
            className="rename-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Chat name"
            maxLength={50}
          />
        </div>
        <div className="rename-modal-actions">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-save" onClick={handleSave} disabled={!newName.trim()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default RenameChatModal;


