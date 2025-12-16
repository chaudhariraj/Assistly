import { useEffect, useRef } from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import './ChatContextMenu.css';

interface ChatContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}

const ChatContextMenu = ({ isOpen, x, y, onClose, onRename, onDelete }: ChatContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="chat-context-menu"
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <button className="context-menu-item" onClick={onRename}>
        <Edit2 size={16} />
        <span>Rename</span>
      </button>
      <div className="context-menu-divider" />
      <button className="context-menu-item context-menu-item-danger" onClick={onDelete}>
        <Trash2 size={16} />
        <span>Delete</span>
      </button>
    </div>
  );
};

export default ChatContextMenu;


