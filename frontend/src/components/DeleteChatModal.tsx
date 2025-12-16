import './DeleteChatModal.css';

interface DeleteChatModalProps {
  isOpen: boolean;
  chatTitle: string;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteChatModal = ({ isOpen, onClose, onConfirm, chatTitle }: DeleteChatModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="delete-chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delete-chat-modal-header">
          <h2>Delete chat?</h2>
        </div>
        <div className="delete-chat-modal-body">
          <p>Are you sure you want to delete <strong>"{chatTitle}"</strong>?</p>
          <p className="delete-warning">This will permanently delete this conversation. This action cannot be undone.</p>
        </div>
        <div className="delete-chat-modal-actions">
          <button className="btn-delete-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-delete-confirm" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteChatModal;


